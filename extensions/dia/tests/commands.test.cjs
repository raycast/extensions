const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

// Exercise the actual command modules with Raycast host calls replaced by spies.
// No browser mutations, network requests, or reads of the user's history occur.
function harness(platform = "win32") {
  const calls = { apple: [], shell: [], open: [], failures: [], sql: [], windows: [] };
  const cache = new Map();
  const pending = [];
  const fixture = path.resolve(root, "tests", "fixture-data");
  const profilePath = path.join(fixture, "Dia", "User Data", "Default");
  const extensionId = "a".repeat(32);
  const files = new Map([
    [
      path.join(fixture, "Dia", "User Data", "Local State"),
      JSON.stringify({ profile: { info_cache: { Default: { name: "Personal" } } } }),
    ],
    [path.join(profilePath, "History"), ""],
    [
      path.join(profilePath, "Preferences"),
      JSON.stringify({
        extensions: {
          settings: {
            [extensionId]: {
              path: `${extensionId}/1.0`,
              state: 1,
              manifest: { name: "Example", action: { default_popup: "popup.html" } },
            },
          },
        },
      }),
    ],
    [
      path.join(profilePath, "Bookmarks"),
      JSON.stringify({
        roots: {
          bookmark_bar: {
            id: "1",
            name: "Bar",
            type: "folder",
            children: [{ id: "2", name: "Example", type: "url", url: "https://example.com" }],
          },
        },
      }),
    ],
  ]);
  const readFile = async (file) => {
    if (!files.has(file)) throw Object.assign(new Error("Missing fixture"), { code: "ENOENT" });
    return files.get(file);
  };
  const components = (name) =>
    new Proxy(function () {}, { get: (_, key) => (key === "testName" ? name : components(`${name}.${String(key)}`)) });
  const jsx = (type, props) => ({ type, props });
  const react = {
    createElement: (type, props, ...children) => jsx(type, { ...props, children }),
    useState: (value) => [value, () => {}],
    useMemo: (fn) => fn(),
    useRef: (current) => ({ current }),
    useEffect: () => {},
  };
  const usePromise = (fn, args = [], options = {}) => {
    if (options.execute !== false)
      pending.push(
        Promise.resolve()
          .then(() => fn(...args))
          .catch((error) => {
            options.onError?.(error);
          }),
      );
    return { isLoading: false, revalidate: () => {}, mutate: () => {} };
  };
  const api = {
    ...Object.fromEntries(
      ["Action", "ActionPanel", "List", "Detail", "Icon", "Color", "Image", "Keyboard", "Toast"].map((key) => [
        key,
        components(key),
      ]),
    ),
    environment: { assetsPath: path.join(root, "assets") },
    getPreferenceValues: () => ({ searchEngine: "bing", defaultTabAction: "open" }),
    open: async (...args) => {
      calls.open.push(args);
    },
    closeMainWindow: async () => {},
    showToast: async (value) => {
      calls.failures.push(value);
    },
    Clipboard: { readText: async () => "https://example.com/clipboard" },
  };
  const utils = {
    useCachedPromise: usePromise,
    usePromise,
    useCachedState: (_, value) => [value, () => {}],
    useFetch: () => ({}),
    getFavicon: () => "favicon",
    showFailureToast: async (error) => {
      calls.failures.push(error);
    },
    runAppleScript: async (...args) => {
      calls.apple.push(args);
      return "[]";
    },
    executeSQL: async (file, query) => {
      calls.sql.push({ file, query });
      return [{ id: 1, url: "https://example.com", title: "Example", lastVisitedAt: "2026-11-16", lastVisitTime: 100 }];
    },
  };
  const tab = {
    windowId: "w1",
    tabId: "t1",
    title: "Example",
    url: "https://example.com",
    isPinned: false,
    isFocused: true,
    space: "Personal",
    isActiveSpace: true,
  };
  const windowsBackend = {
    runWindowsAutomation: async (operation, params) => {
      calls.windows.push({ operation, params });
      if (operation === "tabs") return [tab];
      if (operation === "focused-tab") return tab;
      if (operation === "spaces") return { names: ["Personal"], activeByWindow: { w1: "Personal" } };
      if (operation === "read-tab") return { ...tab, text: "Example page", loading: false, truncated: false };
      return true;
    },
  };
  function load(relative) {
    let filename = path.isAbsolute(relative) ? relative : path.join(root, "src", relative);
    if (!path.extname(filename))
      filename = [filename + ".ts", filename + ".tsx", path.join(filename, "index.ts")].find(fs.existsSync);
    if (!filename) throw new Error(`Missing module: ${relative}`);
    if (path.basename(filename) === "windows-automation.ts") return windowsBackend;
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2023,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText;
    const mocks = {
      "@raycast/api": api,
      "@raycast/utils": utils,
      react,
      "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
      fs: { existsSync: (p) => files.has(p), promises: { readFile } },
      "fs/promises": { readFile },
      os: { homedir: () => fixture },
      child_process: {
        execFileSync: (...args) => {
          calls.shell.push(args);
          return "[]";
        },
      },
    };
    vm.runInNewContext(
      code,
      {
        module,
        exports: module.exports,
        Error,
        URL,
        console,
        process: { platform, env: { LOCALAPPDATA: fixture } },
        setTimeout,
        clearTimeout,
        require: (name) =>
          name.startsWith(".") ? load(path.resolve(path.dirname(filename), name)) : (mocks[name] ?? require(name)),
      },
      { filename },
    );
    return module.exports;
  }
  async function render(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const child of node) await render(child);
      return;
    }
    if (typeof node.type === "function" && !node.type.testName) return render(await node.type(node.props ?? {}));
    if (node.props) for (const value of Object.values(node.props)) await render(value);
  }
  async function flush() {
    for (let i = 0; i < pending.length; i++) await pending[i];
  }
  return { load, calls, render, flush, extensionId };
}

for (const command of manifest.commands) {
  test(`Windows command: ${command.name} never calls AppleScript or osascript`, async () => {
    const h = harness();
    const result = await h.load(command.name).default({ arguments: { url: "example.com" } });
    await h.render(result);
    await h.flush();
    assert.equal(h.calls.apple.length, 0);
    assert.equal(h.calls.shell.length, 0);
    if (command.name === "open-url") assert.equal(h.calls.open[0][1], "TheBrowserCompany.Dia_ttt1ap7aakyb4!Dia");
    if (command.name === "search-tabs")
      assert.deepEqual(
        h.calls.windows.map((call) => call.operation),
        ["search-tabs"],
      );
    if (command.name.startsWith("new-")) assert.equal(h.calls.windows[0].operation, command.name);
  });
}

for (const tool of manifest.tools) {
  test(`Windows tool: ${tool.name} routes correctly`, async () => {
    const h = harness();
    const invoke = () =>
      h.load(`tools/${tool.name}`).default({
        url: "example.com",
        tabId: tool.name === "close-tab" ? "t1" : undefined,
        query: "Example",
        space: tool.name === "switch-space" ? "Personal" : undefined,
      });
    {
      const result = await invoke();
      assert.ok(result);
      if (tool.name === "get-extensions") {
        assert.equal(result[0].profile, "Personal");
        assert.equal(result[0].availableInAllSpaces, false);
      }
      if (["open-url", "open-extension"].includes(tool.name))
        assert.equal(h.calls.open[0][1], "TheBrowserCompany.Dia_ttt1ap7aakyb4!Dia");
    }
    assert.equal(h.calls.apple.length, 0);
    assert.equal(h.calls.shell.length, 0);
    const operation = {
      "select-tab": "focus-tab",
      "close-tab": "close-tab",
      "get-tab-contents": "read-tab",
      "get-tabs": "tabs",
      "get-focused-tab": "focused-tab",
      "get-spaces": "spaces",
      "switch-space": "switch-space",
    }[tool.name];
    if (operation) assert.ok(h.calls.windows.some((call) => call.operation === operation));
  });
}

test("Windows explicit extension space requests fail before launching anything", async () => {
  for (const name of ["get-extensions", "open-extension"]) {
    const h = harness();
    await assert.rejects(
      () => h.load(`tools/${name}`).default({ query: "Example", space: "Work" }),
      /not supported.*Windows/,
    );
    assert.equal(h.calls.open.length, 0);
  }
});

test("macOS window commands retain AppleScript routing", async () => {
  for (const name of ["new-window", "new-incognito-window"]) {
    const h = harness("darwin");
    await h.load(name).default({ arguments: {} });
    assert.equal(h.calls.apple.length, 1);
    assert.equal(h.calls.failures.length, 0);
  }
});
