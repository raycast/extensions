const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
module.exports = function load(file, mocks = {}, globals = {}) {
  const cache = new Map();
  function visit(file) {
    file = path.normalize(file);
    if (file in mocks) return mocks[file];
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    vm.runInNewContext(source, { exports, require: id => {
      if (id in mocks) return mocks[id];
      if (id.startsWith('.')) { const base = path.join(path.dirname(file), id); return visit(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx'); }
      if (id === '@js-temporal/polyfill' || id === 'node:crypto') return require(id);
      throw new Error(`Unexpected dependency ${id}`);
    }, Date, Intl, URLSearchParams, Headers, AbortController, structuredClone, setTimeout, clearTimeout, ...globals });
    return exports;
  }
  return visit(file);
};
