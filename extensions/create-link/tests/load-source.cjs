const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Raycast APIs require its host app. Load the actual source with host/network stubs for unit tests.
module.exports = function loadSource(relativePath, mocks = {}, globals = {}) {
  const filename = path.join(__dirname, "..", "src", relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, esModuleInterop: true },
  });
  const module = { exports: {} };
  vm.runInNewContext(
    outputText,
    {
      module,
      exports: module.exports,
      require(name) {
        if (Object.hasOwn(mocks, name)) return mocks[name];
        if (name.startsWith("node:")) return require(name);
        throw new Error(`Missing test mock: ${name}`);
      },
      URL,
      AbortController,
      setTimeout,
      clearTimeout,
      process,
      console,
      ...globals,
    },
    { filename },
  );
  return module.exports;
};
