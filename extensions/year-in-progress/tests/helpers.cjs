const { readFileSync, existsSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const sourceRoot = path.resolve(__dirname, "../src");

function createLoader(options = {}) {
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(sourceRoot, filename);
    if (!path.extname(filename)) {
      filename = [".ts", ".tsx", "/index.ts"].map((suffix) => filename + suffix).find(existsSync);
    }
    if (options.modules && Object.hasOwn(options.modules, filename)) return options.modules[filename];
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const source = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2021,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText;
    vm.runInNewContext(source, {
      module,
      exports: module.exports,
      process: { platform: options.platform ?? "win32" },
      Date: options.Date ?? Date,
      console,
      setInterval,
      clearInterval,
      setTimeout,
      clearTimeout,
      ...options.globals,
      require: (name) => {
        if (name === "@raycast/api") return options.api;
        if (name === "react" && options.react) return options.react;
        if (options.modules && Object.hasOwn(options.modules, name)) return options.modules[name];
        if (name.startsWith(".")) return load(path.resolve(path.dirname(filename), name));
        return require(name);
      },
    });
    return module.exports;
  }
  return load;
}

function createMemoryStorage(initial = {}) {
  const values = { ...initial };
  const writes = [];
  return {
    values,
    writes,
    api: {
      allItems: async () => ({ ...values }),
      getItem: async (key) => values[key],
      setItem: async (key, value) => {
        writes.push({ key, value });
        values[key] = value;
      },
      removeItem: async (key) => {
        delete values[key];
      },
    },
  };
}

module.exports = { createLoader, createMemoryStorage, sourceRoot };
