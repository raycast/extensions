const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

const configPath = path.resolve(__dirname, '../tsconfig.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
const program = ts.createProgram(parsed.fileNames, parsed.options);
const checker = program.getTypeChecker();

// Output schemas must be finite JSON trees. Follow data properties rather than
// Array prototype methods, and keep ancestors separate from shared leaf types.
function assertFinite(type, ancestors = new Set()) {
  if (type.isUnionOrIntersection()) {
    for (const member of type.types) assertFinite(member, ancestors);
    return;
  }
  if (!(type.flags & ts.TypeFlags.Object)) return;
  assert.ok(!ancestors.has(type), `Recursive tool output: ${checker.typeToString(type)}`);
  const next = new Set(ancestors).add(type);
  if (checker.isArrayType(type)) {
    assertFinite(type.getNumberIndexType(), next);
    return;
  }
  for (const property of type.getProperties()) {
    const declaration = property.valueDeclaration || property.declarations[0];
    assertFinite(checker.getTypeOfSymbolAtLocation(property, declaration), next);
  }
}

for (const name of ['get-projects', 'get-areas']) {
  test(`${name} has a finite output type and retains nested to-do fields`, () => {
    const source = program.getSourceFile(path.resolve(__dirname, `../src/tools/${name}.ts`));
    const declaration = source.statements.find(ts.isFunctionDeclaration);
    const signature = checker.getSignatureFromDeclaration(declaration);
    const output = checker.getAwaitedType(checker.getReturnTypeOfSignature(signature));
    assertFinite(output);
    const item = output.getNumberIndexType();
    const todos = checker.getNonNullableType(checker.getTypeOfPropertyOfType(item, 'todos'));
    const todo = todos.getNumberIndexType();
    for (const field of ['id', 'name', 'status', 'tags', 'dueDate', 'activationDate', 'creationDate', 'notes']) {
      assert.ok(todo.getProperty(field), `Missing nested to-do field: ${field}`);
    }
  });
}
