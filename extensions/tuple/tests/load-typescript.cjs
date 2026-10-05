const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
module.exports = function createLoader(binary, mocks = {}) {
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = new Module(filename, module);
    mod.filename = filename;
    mod.paths = module.paths;
    cache.set(filename, mod);
    mod.require = (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id === "@raycast/api") return { getPreferenceValues: () => ({ tuplePath: binary }) };
      if (id.startsWith(".")) return load(path.resolve(path.dirname(filename), `${id}.ts`));
      return require(id);
    };
    mod._compile(
      ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      }).outputText,
      filename,
    );
    return mod.exports;
  }
  return load;
};
