import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import ts from "typescript";

// Load the extension's TypeScript with mocks for Raycast's native runtime.
export function createLoader(mocks = {}) {
  const modules = new Map();
  return function load(filename) {
    filename = resolve(filename);
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = { exports: {} };
    modules.set(filename, module);
    const require = createRequire(filename);
    const localRequire = (specifier) => {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
      if (!specifier.startsWith(".")) return require(specifier);
      const base = resolve(dirname(filename), specifier);
      const file = [base + ".ts", base + ".tsx", resolve(base, "index.ts")].find(existsSync);
      return file ? load(file) : require(specifier);
    };
    const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX },
      fileName: filename,
    });
    new Function("require", "module", "exports", outputText)(localRequire, module, module.exports);
    return module.exports;
  };
}
