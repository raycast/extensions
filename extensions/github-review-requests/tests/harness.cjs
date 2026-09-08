const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
const state = { preferences: {}, storage: new Map(), clears: 0, failWrite: undefined };
const api = {
  getPreferenceValues: () => state.preferences,
  LocalStorage: {
    getItem: async key => state.storage.get(key),
    setItem: async (key, value) => {
      if (state.failWrite === key) throw new Error("storage unavailable");
      state.storage.set(key, value);
    },
    removeItem: async key => state.storage.delete(key),
    allItems: async () => Object.fromEntries(state.storage),
  },
  Cache: class {
    clear() {
      state.clears++;
    }
  },
  environment: { isDevelopment: false, launchType: "background" },
  LaunchType: { Background: "background", UserInitiated: "user" },
  updateCommandMetadata: async () => {},
};
const original = Module._load;
Module._load = function (id, parent, isMain) {
  if (id === "@raycast/api") return api;
  if (id === "@raycast/utils")
    return {
      useCachedPromise() {
        throw new Error("UI hook invoked in domain test");
      },
    };
  return original.call(this, id, parent, isMain);
};
require.extensions[".ts"] = (mod, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  });
  mod._compile(outputText, filename);
};
function reset() {
  state.preferences = { token: "test-pat", ghPath: "/nonexistent/gh" };
  state.storage.clear();
  state.clears = 0;
  state.failWrite = undefined;
  api.environment.launchType = "background";
}
module.exports = { state, api, reset };
