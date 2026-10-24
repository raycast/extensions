import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

export function load(path, mocks) {
  const filename = new URL(path, import.meta.url);
  const require = createRequire(filename);
  const module = { exports: {} };
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    fileName: filename.pathname,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  new Function("require", "module", "exports", outputText)(
    (name) => (Object.hasOwn(mocks, name) ? mocks[name] : require(name)),
    module,
    module.exports,
  );
  return module.exports;
}
