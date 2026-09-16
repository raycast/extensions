import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Raycast owns rendering and hooks in production. This harness runs the actual
// command handlers, storage and providers, isolating only host APIs and HTTP.
export function commandHarness(command, options = {}) {
  const storage = new Map();
  const toasts = [];
  const pasted = [];
  const copied = [];
  const alerts = [];
  const launched = [];
  const timers = new Map();
  const preferences = { presetLanguage: "en", ...options.preferences };
  const state = [];
  const effects = [];
  let cursor = 0;
  let pendingEffects = [];
  let tree;
  let confirmed = false;
  let request = async () =>
    Response.json({ message: { content: "Rewritten." } });
  const component = (name, members = {}) =>
    Object.assign(() => null, members, { displayName: name });
  const Action = component("Action", {
    Push: component("Push"),
    Style: { Destructive: "destructive" },
  });
  const List = component("List", {
    Item: component("Item"),
    EmptyView: component("EmptyView"),
  });
  const api = {
    Action,
    List,
    ActionPanel: component("ActionPanel", { Submenu: component("Submenu") }),
    Form: component("Form"),
    Icon: new Proxy({}, { get: (_, name) => name }),
    Alert: { ActionStyle: { Destructive: "destructive" } },
    Toast: { Style: { Failure: "failure" } },
    LaunchType: { UserInitiated: "user" },
    PopToRootType: { Immediate: "immediate" },
    getPreferenceValues: () => preferences,
    getSelectedText: async () => {
      if (options.selectionError) throw new Error(options.selectionError);
      return options.text ?? "Original text.";
    },
    LocalStorage: {
      getItem: async (key) => storage.get(key),
      setItem: async (key, value) => {
        storage.set(key, value);
      },
      removeItem: async (key) => {
        storage.delete(key);
      },
    },
    Clipboard: {
      copy: async (text) => {
        copied.push(text);
      },
      paste: async (text) => {
        pasted.push(text);
      },
    },
    closeMainWindow: async () => {},
    showToast: async (toast) => {
      toasts.push(toast);
    },
    confirmAlert: async (alert) => {
      alerts.push(alert);
      return confirmed;
    },
    launchCommand: async (launch) => {
      launched.push(launch);
    },
    openExtensionPreferences: async () => {
      launched.push("preferences");
    },
  };
  const hooks = {
    useState(initial) {
      const slot = cursor++;
      if (!(slot in state))
        state[slot] = typeof initial === "function" ? initial() : initial;
      return [
        state[slot],
        (value) => {
          state[slot] =
            typeof value === "function" ? value(state[slot]) : value;
        },
      ];
    },
    useRef(initial) {
      return hooks.useState(() => ({ current: initial }))[0];
    },
    useEffect(effect, deps) {
      const slot = cursor++;
      if (
        !effects[slot] ||
        deps.some((value, index) => value !== effects[slot][index])
      ) {
        effects[slot] = deps;
        pendingEffects.push(effect);
      }
    },
  };
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    runInNewContext(
      compiled,
      {
        module,
        exports: module.exports,
        AbortController,
        URL,
        console,
        fetch: (...args) => request(...args),
        setTimeout: (callback, delay) => {
          timers.set(callback, delay);
          return callback;
        },
        clearTimeout: (id) => {
          timers.delete(id);
        },
        require(specifier) {
          if (specifier === "@raycast/api") return api;
          if (specifier === "react") return hooks;
          if (specifier === "react/jsx-runtime")
            return {
              jsx: (type, props) => ({ type, props }),
              jsxs: (type, props) => ({ type, props }),
            };
          const path = resolve(dirname(filename), specifier);
          const target = [path, `${path}.ts`, `${path}.tsx`].find(existsSync);
          if (!target) throw new Error(`Unsupported import: ${specifier}`);
          return load(target);
        },
      },
      { filename },
    );
    return module.exports;
  }
  const root = fileURLToPath(new URL("../../src/", import.meta.url));
  const Command = load(resolve(root, `${command}.tsx`)).default;
  function render() {
    cursor = 0;
    tree = Command();
    const pending = pendingEffects;
    pendingEffects = [];
    pending.forEach((effect) => effect());
  }
  async function settle() {
    render();
    await new Promise(setImmediate);
    render();
  }
  function elements(name) {
    const found = [];
    function visit(value) {
      if (Array.isArray(value)) return value.forEach(visit);
      if (!value || typeof value !== "object" || !value.props) return;
      if (value.type.displayName === name) found.push(value);
      visit(value.props.children);
      visit(value.props.actions);
    }
    visit(tree);
    return found;
  }
  return {
    storage,
    toasts,
    pasted,
    copied,
    alerts,
    launched,
    timers,
    preferences,
    settle,
    elements,
    get tree() {
      return tree;
    },
    setRequest(value) {
      request = value;
    },
    confirm(value) {
      confirmed = value;
    },
    action(title, index = 0) {
      const action = elements("Action").filter(
        (item) => item.props.title === title,
      )[index];
      if (!action) throw new Error(`Action not available: ${title}`);
      return action.props.onAction();
    },
  };
}
