const { readFileSync } = require("node:fs");
const { resolve, dirname } = require("node:path");
const ts = require("typescript");

// Compile production modules while replacing only the Raycast and macOS boundaries.
function loadSource(entry, mocks) {
  const cache = new Map();
  function load(path) {
    if (cache.has(path)) return cache.get(path).exports;
    const module = { exports: {} };
    cache.set(path, module);
    const code = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const localRequire = (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith(".")) return load(resolve(dirname(path), `${name}.ts`));
      return require(name);
    };
    new Function("require", "module", "exports", code)(localRequire, module, module.exports);
    return module.exports;
  }
  return load(resolve(__dirname, "..", "src", entry));
}

function apiMock(initial = {}) {
  const storage = new Map(Object.entries(initial));
  const hud = [],
    launches = [],
    toasts = [];
  return {
    storage,
    hud,
    launches,
    toasts,
    api: {
      LocalStorage: {
        getItem: async (key) => storage.get(key),
        setItem: async (key, value) => {
          storage.set(key, value);
        },
      },
      showHUD: async (message) => {
        hud.push(message);
      },
      showToast: async (options) => {
        toasts.push(options);
      },
      launchCommand: async (options) => {
        launches.push(options);
      },
      environment: { entryPointName: "index", launchType: "userInitiated" },
      LaunchType: { Background: "background" },
      Toast: { Style: { Failure: "failure", Success: "success" } },
      Icon: {},
      getPreferenceValues: () => ({ hideInvalidDevices: true, sortBy: "ascService" }),
    },
  };
}

const service = (overrides = {}) => ({
  id: "service:Work VPN",
  name: "Work VPN",
  hardwarePort: "L2TP",
  device: "",
  status: "disconnected",
  favorite: false,
  order: 0,
  ...overrides,
});
const serviceOrder = (rows) =>
  "An asterisk (*) denotes that a network service is disabled.\n" +
  rows
    .map(
      ([position, name, port = "L2TP", device = ""]) =>
        `(${position}) ${name}\n(Hardware Port: ${port}, Device: ${device})\n`,
    )
    .join("\n");
const vpnList = (rows) =>
  "Available network connection services in the current set (*=enabled):\n" +
  rows
    .map(
      ([name, status = "Disconnected"]) =>
        `* (${status}) 77CBFCC4-03EC-400F-B2A7-4729B042572B PPP --> L2TP "${name}" [PPP:L2TP]`,
    )
    .join("\n");
module.exports = { loadSource, apiMock, service, serviceOrder, vpnList };
