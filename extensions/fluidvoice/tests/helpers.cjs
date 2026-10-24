const { readFileSync } = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

function load(file, mocks = {}) {
  const filename = path.join(__dirname, "../src", file);
  const code = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const compiled = new Module(filename, module);
  const originalRequire = Module.createRequire(filename);
  compiled.require = (name) => (Object.hasOwn(mocks, name) ? mocks[name] : originalRequire(name));
  compiled._compile(code, filename);
  return compiled.exports;
}

module.exports = { load };
