const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const vm = require("node:vm");
const ts = require("typescript");

// Exercise the TypeScript source with Node's test runner, without Raycast or a new test dependency.
module.exports = function loadTypeScript(relativePath, mocks = {}, cache = new Map()) {
  const filename = path.resolve(__dirname, "..", relativePath);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const localRequire = createRequire(filename);
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, esModuleInterop: true },
  }).outputText;
  const run = vm.runInThisContext(`(function(require, module, exports) {\n${compiled}\n})`, { filename });
  run(
    (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith(".")) {
        return loadTypeScript(path.resolve(path.dirname(filename), `${name}.ts`), mocks, cache);
      }
      return localRequire(name);
    },
    module,
    module.exports,
  );
  return module.exports;
};
