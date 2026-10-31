import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInThisContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const compiled = new Map();

export function loadSource(path, dependencies) {
  if (!compiled.has(path)) {
    const source = readFileSync(new URL(path, new URL("../stop-streaming.test.mjs", import.meta.url)), "utf8");
    const { outputText } = ts.transpileModule(source, {
      fileName: path,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: false,
      },
    });
    compiled.set(path, runInThisContext(`(function(require, exports) { ${outputText}\n})`, { filename: path }));
  }
  const exports = {};
  compiled.get(path)((name) => dependencies[name] ?? require(name), exports);
  return exports;
}
