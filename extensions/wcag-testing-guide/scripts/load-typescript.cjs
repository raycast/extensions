/** Load local TypeScript modules for behavioral tests without starting Raycast. */
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function createLoader(mocks = {}) {
  const moduleCache = new Map();
  function loadModule(file) {
    const absolutePath = path.resolve(__dirname, "..", file);
    if (moduleCache.has(absolutePath)) return moduleCache.get(absolutePath).exports;
    const module = { exports: {} };
    moduleCache.set(absolutePath, module);
    const compiled = ts.transpileModule(fs.readFileSync(absolutePath, "utf8"), {
      fileName: absolutePath,
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    });
    const localRequire = (specifier) => {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
      if (specifier.startsWith(".")) {
        const base = path.resolve(path.dirname(absolutePath), specifier);
        const resolved = [base + ".ts", base + ".tsx"].find((candidate) => fs.existsSync(candidate));
        if (!resolved) throw new Error(`Cannot resolve ${specifier} from ${absolutePath}`);
        return loadModule(resolved);
      }
      return require(specifier);
    };
    new Function("require", "module", "exports", compiled.outputText)(localRequire, module, module.exports);
    return module.exports;
  }
  return loadModule;
}

module.exports = { loadModule: createLoader(), createLoader };
