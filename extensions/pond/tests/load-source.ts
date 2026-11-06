import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";

/** Load extension code with native Raycast boundaries replaced for Node tests. */
export async function loadSource<T>(relativePath: string, replacements: Record<string, unknown>): Promise<T> {
  const filename = join(__dirname, "../src", relativePath);
  const source = await readFile(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2023,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const exports = {};
  const requireModule = createRequire(filename);
  runInNewContext(outputText, {
    exports,
    require: (name: string) => (Object.hasOwn(replacements, name) ? replacements[name] : requireModule(name)),
    // Keep error identity across the test boundary.
    Error,
  });
  return exports as T;
}
