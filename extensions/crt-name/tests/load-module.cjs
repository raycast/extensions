const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadModule(filename, mocks) {
  const module = { exports: {} };
  const source = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const localRequire = (name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith(".")) return loadModule(resolve(filename, "..", `${name}.ts`), mocks);
    return require(name);
  };
  vm.runInThisContext(`(function(require, module, exports, fetch) { ${source}\n })`)(
    localRequire,
    module,
    module.exports,
    mocks.fetch ?? globalThis.fetch,
  );
  return module.exports;
}

module.exports = { loadModule };
