// Extract only static artwork metadata from an explicitly selected Executor checkout.
// Usage: node scripts/update-integration-artwork.mjs /path/to/executor <commit>
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import ts from "typescript";

const [checkout, revision] = process.argv.slice(2);
if (!checkout || !/^[a-f0-9]{40}$/.test(revision ?? "")) throw new Error("Supply a checkout and full commit SHA.");
const sources = [
  ["openapi", "packages/plugins/openapi/src/sdk/presets.ts"],
  ["openapi", "packages/plugins/openapi/src/providers/google/presets.ts"],
  ["mcp", "packages/plugins/mcp/src/sdk/presets.ts"],
  ["graphql", "packages/plugins/graphql/src/sdk/presets.ts"],
];
const artwork = [];
for (const [kind, path] of sources) {
  const text = execFileSync("git", ["-C", checkout, "show", `${revision}:${path}`], { encoding: "utf8" });
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const declarations = new Map();
  function collect(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      declarations.set(node.name.text, node.initializer);
    }
    ts.forEachChild(node, collect);
  }
  collect(source);
  function literal(node, bindings = new Map(), depth = 0) {
    if (!node || depth > 10) return undefined;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (ts.isIdentifier(node))
      return bindings.get(node.text) ?? literal(declarations.get(node.text), bindings, depth + 1);
    if (ts.isTemplateExpression(node)) {
      let result = node.head.text;
      for (const span of node.templateSpans) {
        const value = literal(span.expression, bindings, depth + 1);
        if (value === undefined) return undefined;
        result += value + span.literal.text;
      }
      return result;
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const fn = declarations.get(node.expression.text);
      if (!fn || !ts.isArrowFunction(fn)) return undefined;
      const args = node.arguments.map((arg) => literal(arg, bindings, depth + 1));
      if (args.some((arg) => arg === undefined)) return undefined;
      return literal(
        fn.body,
        new Map(fn.parameters.map((param, index) => [param.name.getText(source), args[index]])),
        depth + 1,
      );
    }
    return undefined;
  }
  function extract(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const fields = new Map(
        node.properties.filter(ts.isPropertyAssignment).map((p) => [p.name.getText(source), p.initializer]),
      );
      if (fields.has("id") && fields.has("url") && fields.has("icon")) {
        const id = literal(fields.get("id"));
        const url = literal(fields.get("url"));
        const icon = literal(fields.get("icon"));
        if (!id || !url || !icon)
          throw new Error(`Unresolved artwork in ${path}: ${node.getText(source).slice(0, 80)}`);
        if (url.startsWith("https://") && icon.startsWith("https://")) artwork.push({ kind, id, url, icon });
      }
    }
    ts.forEachChild(node, extract);
  }
  extract(source);
}
if (!artwork.length) throw new Error("No upstream artwork found.");
const output = {
  source: "https://github.com/UsefulSoftwareCo/executor",
  revision,
  sources: sources.map(([, path]) => path),
  artwork,
};
writeFileSync("src/lib/integration-artwork.json", JSON.stringify(output, null, 2) + "\n");
writeFileSync(
  "EXECUTOR-NOTICE.txt",
  "Integration artwork metadata is derived from Executor at " +
    revision +
    ".\n\n" +
    execFileSync("git", ["-C", checkout, "show", `${revision}:LICENSE`], { encoding: "utf8" }),
);
console.log(`Extracted ${artwork.length} upstream artwork entries.`);
