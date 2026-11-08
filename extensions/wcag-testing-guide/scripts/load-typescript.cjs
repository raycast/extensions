/** Load local TypeScript modules for data tests without starting the Raycast runtime. */
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

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
    if (specifier.startsWith(".")) {
      return loadModule(path.relative(path.resolve(__dirname, ".."), path.resolve(path.dirname(absolutePath), specifier + ".ts")));
    }
    return require(specifier);
  };
  new Function("require", "module", "exports", compiled.outputText)(localRequire, module, module.exports);
  return module.exports;
}

module.exports = { loadModule };
