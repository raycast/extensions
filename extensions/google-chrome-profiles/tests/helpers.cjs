const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

exports.loadModule = function loadModule(filename, mocks = {}, cache = new Map()) {
  filename = path.resolve(__dirname, "..", filename);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, esModuleInterop: true },
  }).outputText;
  const localRequire = (id) => {
    if (id in mocks) return mocks[id];
    if (id.startsWith(".")) return loadModule(path.resolve(path.dirname(filename), `${id}.ts`), mocks, cache);
    return require(id);
  };
  vm.runInThisContext(`(function(require, module, exports) { ${code}\n})`, { filename })(
    localRequire,
    module,
    module.exports,
  );
  return module.exports;
};
