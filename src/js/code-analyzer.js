import * as esprima from 'esprima';


const parseCode = (codeToParse) => {
    return esprima.parseScript(codeToParse,{loc:true});
};

let list = [];


function appendObject(line,type,name,condition,value) {
    const obj = {
        line : line,
        type : type,
        name : name,
        condition : condition,
        value : value
    };
    list.push(obj);
}

function addReturnStatement(node){
    appendObject(node.loc.start.line,node.type,'','',getStatement(node.argument));
}


function addAssignmentExpression(node){
    appendObject(node.loc.start.line,node.type,getStatement(node.left),'',getStatement(node.right));
}

function addVariableDeclaration(node){
    for (let dec in node.declarations){
        addStatement(node.declarations[dec]);
    }
}

function addVariableDeclarator(node){
    appendObject(node.loc.start.line,node.type,getStatement(node.id),'',getStatement(node.init));
}

function addIfStatement(node){
    //check else if
    let type = node.else ? 'else '+ node.type : node.type;
    appendObject(node.loc.start.line,type,'',getStatement(node.test),'');


    addStatement(node.consequent);


    if (node.alternate){
        if (node.alternate.type==='IfStatement'){
            node.alternate.else=true;
        }
        else{
            appendObject(node.consequent.loc.end.line+1,'else statement','','','');
        }
        addStatement(node.alternate);
    }
}

function addFunctionDeclaration(node){
    appendObject(node.loc.start.line,node.type,node.id.name,'','');

    //push params
    for (let param in node.params){
        appendObject(node.loc.start.line,'VariableDeclarator',getStatement(node.params[param]),'','');
    }

    //push function body
    for (let statement in node.body.body) {
        addStatement(node.body.body[statement]);

    }

}

function addWhileStatement(node){
    appendObject(node.loc.start.line,node.type,'',getStatement(node.test),'');
    for (let statement in node.body.body){
        addStatement(node.body.body[statement]);
    }
}


function addForStatement(node){
    let condition = getStatement(node.init) +';'+ getStatement(node.test)+';'+getStatement(node.update);
    appendObject(node.loc.start.line,node.type,'',condition,'');

    for (let statement in node.body.body){
        addStatement(node.body.body[statement]);
    }
}

function addExpression(node){
    addStatement(node.expression);
}

function addUpdateExpression(node){
    let arg = getStatement(node.argument);
    if (node.prefix===false){
        appendObject(node.loc.start.line,node.type,arg,'',arg + node.operator);
    }
    else{
        appendObject(node.loc.start.line,node.type,arg,'',node.operator+arg);
    }

}

function addBlockStatement(node){
    for (let statement in node.body){
        addStatement(node.body[statement]);
    }
}


function addStatement(node){


    const choices = {
        'ExpressionStatement' : addExpression,
        'ReturnStatement' : addReturnStatement,
        'AssignmentExpression' : addAssignmentExpression,
        'VariableDeclaration' : addVariableDeclaration,
        'VariableDeclarator' : addVariableDeclarator,
        'IfStatement' : addIfStatement,
        'FunctionDeclaration' : addFunctionDeclaration,
        'WhileStatement' : addWhileStatement,
        'ForStatement' : addForStatement,
        'UpdateExpression' : addUpdateExpression,
        'BlockStatement' : addBlockStatement
    };

    choices[node.type](node);

}

function getLiteral(node){
    return node.value;
}

function getIdentifier(node){
    return node.name;
}

function getVariableDeclaration(node){
    let str = '';

    let first = true;

    for (var dec in node.declarations){
        if (first) {
            str += getStatement(node.declarations[dec]);
            first=false;
        }
        else{
            str += ','+getStatement(node.declarations[dec]);
        }
    }
    return str;
}

function getSequenceExpression(node){
    let str = '';

    let first = true;

    for (let exp in node.expressions){
        if (first) {
            str += getStatement(node.expressions[exp]);
            first=false;
        }
        else{
            str += ','+getStatement(node.expressions[exp]);
        }
    }
    return str;
}

function getVariableDeclarator(node){
    return getStatement(node.id) + '=' + getStatement(node.init);
}

function getMemberExpression(node){
    return getStatement(node.object) + '['+getStatement(node.property)+']';
}

function getUnaryExpression(node){
    return node.operator + getStatement(node.argument);
}

function fixBrackets(node){
    return node.type === 'BinaryExpression' && (node.operator === '+' || node.operator === '-');

}

function getBinaryExpression(node){
    let left = getStatement(node.left);
    let right = getStatement(node.right);

    //(1+2)*3
    if (node.operator==='*' || node.operator==='/') {
        if (fixBrackets(node.left)){
            left = '(' + left + ')';
        }
        if (fixBrackets(node.right)){
            right = '(' + right + ')';
        }
    }
    return left + node.operator + right;
}

function getUpdateExpression(node){
    if (node.prefix===false){
        return getStatement(node.argument)+node.operator;
    }
    else{
        return node.operator + getStatement(node.argument);
    }

}

function getAssignmentExpression(node){
    return getStatement(node.left) +'='+getStatement(node.right);
}

function getStatement(node){
    //for null init in var declaration. (node.init)
    if (node===null){
        return '';
    }
    const choices = {
        'Literal' : getLiteral,
        'Identifier' : getIdentifier,
        'VariableDeclaration' : getVariableDeclaration,
        'VariableDeclarator' : getVariableDeclarator,
        'SequenceExpression' : getSequenceExpression,
        'getVariableDeclarator' : getMemberExpression,
        'MemberExpression' : getMemberExpression,
        'UnaryExpression' : getUnaryExpression,
        'BinaryExpression' : getBinaryExpression,
        'UpdateExpression' : getUpdateExpression,
        'AssignmentExpression' : getAssignmentExpression
    };
    return choices[node.type](node);
}




function iterateStatements(root){

    let body = root.body;
    for (let line in body){
        addStatement(body[line]);
    }
}


const table = (parsedCode)=>{


    iterateStatements(parsedCode);

    let ans = [];
    for (let statement in list){
        ans.push(list[statement]);
        //console.log(list[statement]);
    }

    // console.log("ans length:"+ans.length);
    //console.log(parsedCode);

    list = [];
    return ans;
};


export {parseCode,table};
