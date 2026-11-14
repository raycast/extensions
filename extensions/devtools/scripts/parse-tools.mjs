import ts from "typescript";

/** Read static registry metadata without executing the app or silently skipping entries. */
export function parseTools(source, filename = "toolRegistry.ts") {
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const fail = (message) => {
    throw new Error(`${filename}: ${message}`);
  };
  if (file.parseDiagnostics.length) fail("Invalid TypeScript registry.");
  const declarations = file.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .filter((declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === "ALL_TOOLS");
  if (declarations.length !== 1) fail("Expected one ALL_TOOLS declaration.");
  let array = declarations[0].initializer;
  while (
    array &&
    (ts.isAsExpression(array) || ts.isSatisfiesExpression(array) || ts.isParenthesizedExpression(array))
  ) {
    array = array.expression;
  }
  if (!array || !ts.isArrayLiteralExpression(array) || !array.elements.length) {
    fail("ALL_TOOLS must be a non-empty array literal.");
  }
  const ids = new Set();
  return array.elements.map((element, index) => {
    const invalid = (message) => fail(`ALL_TOOLS entry ${index + 1}: ${message}`);
    if (!ts.isObjectLiteralExpression(element)) invalid("Expected an object literal.");
    const fields = new Map();
    for (const property of element.properties) {
      if (
        !ts.isPropertyAssignment(property) ||
        (!ts.isIdentifier(property.name) && !ts.isStringLiteral(property.name))
      ) {
        invalid("Expected explicit named properties; spreads and computed properties are unsupported.");
      }
      const name = property.name.text;
      if (fields.has(name)) invalid(`Duplicate property ${name}.`);
      fields.set(name, property.initializer);
    }
    const stringValue = (node, field) => {
      if (!node || !ts.isStringLiteralLike(node)) invalid(`${field} must be a string literal.`);
      return node.text;
    };
    const id = stringValue(fields.get("id"), "id");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || ids.has(id)) invalid(`Invalid or duplicate tool id: ${id}.`);
    ids.add(id);
    const keywords = fields.get("keywords");
    if (keywords && !ts.isArrayLiteralExpression(keywords)) invalid("keywords must be an array literal.");
    return {
      id,
      name: stringValue(fields.get("name"), "name"),
      category: stringValue(fields.get("category"), "category"),
      keywords: keywords ? keywords.elements.map((keyword) => stringValue(keyword, "keyword")) : [],
    };
  });
}
