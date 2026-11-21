const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Load production TypeScript with only the Raycast host and React hooks mocked.
module.exports = function loadSource(entry, mocks = {}) {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const localRequire = (specifier) => {
      if (specifier in mocks) return mocks[specifier];
      if (specifier === "@raycast/api") throw new Error("Tests must mock the Raycast host");
      if (!specifier.startsWith(".")) return require(specifier);
      const base = path.resolve(path.dirname(filename), specifier);
      const resolved = [base, `${base}.ts`, `${base}.tsx`].find((file) => fs.existsSync(file));
      return load(resolved);
    };
    vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename })(localRequire, module, module.exports);
    return module.exports;
  }
  return load(path.resolve(__dirname, "..", entry));
};
