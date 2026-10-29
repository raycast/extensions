const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
function load(file, mocks, modules = new Map()) {
  file = path.resolve(file);
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} };
  modules.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const requireMock = (name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith(".")) return load(path.resolve(path.dirname(file), name + ".ts"), mocks, modules);
    return require(name);
  };
  new Function("require", "module", "exports", code)(requireMock, module, module.exports);
  return module.exports;
}

module.exports = { load };
