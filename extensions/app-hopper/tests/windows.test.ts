import * as nativeCatalog from "../src/native-helper-catalog";
import type { MockValue, MockModules } from "./load-ts.ts";
import { renderer, findAll, type TestNode } from "./render-ui.ts";
import assert from "node:assert/strict";
import test from "node:test";
import createLoader from "./load-ts.ts";

function modules(extra: MockModules = {}) {
  const load = createLoader({
    "../native-helper-catalog": { ...nativeCatalog, nativeHelperSourceHash: () => "v1" },
    "../helpers/browser-helper": {
      runBrowserHelper: (...args) => load("src/helpers/native-helper.ts").runNativeHelper(...args),
    },
    "@raycast/api": { environment: { supportPath: "/mock" } },
    "node:child_process": {
      execFile: () => {
        throw new Error("Unexpected system operation");
      },
    },
    ...extra,
  });
  return load;
}

const native = {
  id: 10,
  pid: 20,
  app: "Test",
  title: "Test",
  space: 1,
  frame: { x: 0, y: 0, w: 800, h: 600 },
  "has-ax-reference": true,
};
const ax = { pid: 20, index: 1, title: "Test", subrole: "AXStandardWindow" };
const app = { id: "test", name: "Test", windows: [native] };

function operations(overrides = {}) {
  const calls: MockValue[] = [];
  return {
    calls,
    queryWindows: async () => [native],
    queryAXWindows: async () => [ax],
    focusNativeWindowById: async () => {
      calls.push("native");
    },
    raiseAXWindow: async () => {
      calls.push("ax");
    },
    requestApplicationWindow: async () => {
      calls.push("reopen");
    },
    ...overrides,
  };
}

const { activateApplication, focusNativeWindow } = modules()("src/window-focus.ts");

test("a reused window ID from another process is treated as missing", async () => {
  const ops = operations({ queryWindows: async () => [{ ...native, pid: 99 }] });
  assert.equal(await focusNativeWindow(native, ops), "missing");
  assert.equal(await activateApplication(app, ops), "missing");
  assert.deepEqual(ops.calls, []);
});

test("focus failure detects a window that closed during the operation", async () => {
  let queries = 0;
  const ops = operations({
    queryWindows: async () => (++queries === 1 ? [native] : []),
    focusNativeWindowById: async () => {
      throw new Error("Closed");
    },
  });
  assert.equal(await focusNativeWindow(native, ops), "missing");
});

test("a failed verification after focus failure preserves the original error", async () => {
  let queries = 0;
  const failure = new Error("Focus failed");
  const ops = operations({
    queryWindows: async () => {
      if (++queries > 1) throw new Error("Query failed");
      return [native];
    },
    focusNativeWindowById: async () => {
      throw failure;
    },
  });
  await assert.rejects(focusNativeWindow(native, ops), (error) => error === failure);
});

test("native focus succeeds without touching Accessibility or reopening", async () => {
  const ops = operations();
  assert.equal(await activateApplication(app, ops), "focused");
  assert.deepEqual(ops.calls, ["native"]);
});

test("failed native focus raises the accessible window without reopening", async () => {
  const ops = operations({
    focusNativeWindowById: async () => {
      throw new Error("No native focus");
    },
  });
  assert.equal(await activateApplication(app, ops), "focused");
  assert.deepEqual(ops.calls, ["ax"]);
});

test("Accessibility permission failure never authorizes reopening", async () => {
  const ops = operations({
    queryAXWindows: async () => {
      throw new Error("Permission denied");
    },
  });
  await assert.rejects(
    activateApplication(
      { ...app, windows: [{ ...native, "has-ax-reference": false }] },
      {
        ...ops,
        queryWindows: async () => [{ ...native, "has-ax-reference": false }],
      },
    ),
    /Permission denied/,
  );
  assert.deepEqual(ops.calls, []);
});

test("multiple accessible windows require selection; zero accessible windows allow reopening", async () => {
  for (const count of [0, 2]) {
    const ops = operations({
      queryWindows: async () => [{ ...native, "has-ax-reference": false }],
      queryAXWindows: async () => Array.from({ length: count }, () => ax),
    });
    assert.equal(await activateApplication(app, ops), count === 0 ? "focused" : "multiple");
    assert.deepEqual(ops.calls, count === 0 ? ["reopen"] : []);
  }
});

test("failure to raise an existing AX window does not fall through to reopening", async () => {
  const ops = operations({
    queryWindows: async () => [{ ...native, "has-ax-reference": false }],
    raiseAXWindow: async () => {
      throw new Error("Stale AX index");
    },
  });
  await assert.rejects(activateApplication(app, ops), /Stale AX index/);
  assert.deepEqual(ops.calls, []);
});

test("the initial list and other metadata are published while browser summary is still pending", async () => {
  const { loadWindowData } = modules()("src/window-data.ts");
  const snapshots: MockValue[] = [];
  let finishSummary!: (summary: { windows: number; tabs: number }) => void;
  const pending = new Promise<{ windows: number; tabs: number }>((resolve) => {
    finishSummary = resolve;
  });
  const loading = loadWindowData((data: MockValue) => snapshots.push(data), {
    queryWindows: async () => [{ ...native, app: "Google Chrome" }],
    getRunningApplicationMetadata: async () => ({ 20: { pid: 20, bundlePath: "/Chrome.app" } }),
    queryAXWindows: async () => {
      throw new Error("Browsers should not use AX fallback");
    },
    getBrowserSummary: () => pending,
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(snapshots[0].windows.length, 1);
  assert.deepEqual(snapshots[0].browserCounts, {});
  assert.equal(snapshots.at(-1).metadataByPid[20].bundlePath, "/Chrome.app");
  finishSummary({ windows: 1, tabs: 4 });
  await loading;
  assert.deepEqual(snapshots.at(-1).browserCounts.chrome, { windows: 1, tabs: 4 });
});

test("browser tabs are cached in the root snapshot without blocking the initial list", async () => {
  const { loadWindowData } = modules()("src/window-data.ts");
  const snapshots: MockValue[] = [];
  const tabs = [{ id: "10:0", title: "Docs", url: "https://example.com/docs" }];
  await loadWindowData((data: MockValue) => snapshots.push(data), {
    queryWindows: async () => [{ ...native, app: "Google Chrome" }],
    getRunningApplicationMetadata: async () => ({}),
    queryAXWindows: async () => [],
    getBrowserSummary: async () => {
      throw new Error("Summary should not be needed when tabs can be loaded");
    },
    getBrowserWindows: async () => [{ id: "10", title: "Docs", tabs }],
  });
  assert.deepEqual(snapshots[0].browserTabs, {});
  assert.deepEqual(snapshots.at(-1).browserTabs.chrome[0].tabs, tabs);
  assert.deepEqual(snapshots.at(-1).browserCounts.chrome, { windows: 1, tabs: 1 });
});

test("AX fallback is queried for processes with any missing native reference", async () => {
  const { loadWindowData } = modules()("src/window-data.ts");
  const queried: number[] = [],
    snapshots: MockValue[] = [];
  await loadWindowData((data: MockValue) => snapshots.push(data), {
    queryWindows: async () => [
      native,
      { ...native, id: 11, "has-ax-reference": false },
      { ...native, id: 12, pid: 30, "has-ax-reference": false },
    ],
    getRunningApplicationMetadata: async () => ({}),
    getBrowserSummary: async () => {
      throw new Error("Unexpected browser");
    },
    queryAXWindows: async (pid: number) => {
      queried.push(pid);
      return [];
    },
  });
  assert.deepEqual(queried, [20, 30]);
  assert.deepEqual(snapshots.at(-1).axWindowsByPid, { 20: [], 30: [] });
});

test("Chromium summary uses the native Swift helper and skips it when multiple accessible windows exist", async () => {
  const calls: MockValue[] = [];
  const axWindowsOutput = [
    {
      id: "10777",
      title: "Netflix",
      space: 3,
      tabs: [
        { id: "10777:0", title: "ChatGPT", url: "chatgpt.com" },
        { id: "10777:1", title: "Netflix", url: "https://www.netflix.com/browse" },
      ],
    },
  ];
  const { getNativeBrowserSummary } = modules({
    "node:fs": { existsSync: () => true },
    "node:child_process": {
      execFile: (bin, args, options, callback) => {
        calls.push({ bin, args, options });
        if (bin.endsWith("chromium-ax-v1") && args[0] === "list") {
          callback(null, JSON.stringify(axWindowsOutput), "");
          return;
        }
        callback(null, "[]", "");
      },
    },
  })("src/browsers/native.ts");

  const singleNative = [{ ...native, id: 10777, app: "Microsoft Edge", space: 3 }];
  assert.deepEqual(await getNativeBrowserSummary({ appName: "Microsoft Edge", engine: "chromium" }, singleNative), {
    windows: 1,
    tabs: 2,
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.timeout, 10000);

  calls.length = 0;
  const multiNative = [
    { ...native, id: 57812, app: "Google Chrome", space: 1 },
    { ...native, id: 57817, app: "Google Chrome", space: 3 },
  ];
  assert.deepEqual(await getNativeBrowserSummary({ appName: "Google Chrome", engine: "chromium" }, multiNative), {
    windows: 2,
  });
  assert.equal(calls.length, 0);
});

test("WebKit browsers (Safari and Orion) are registered and supported via webkit-ax helper", async () => {
  const calls: MockValue[] = [];
  const axWindowsOutput = [
    {
      id: "20400",
      title: "Apple",
      space: 2,
      tabs: [
        { id: "20400:0", title: "Apple", url: "https://www.apple.com" },
        { id: "20400:1", title: "WebKit", url: "https://webkit.org" },
      ],
    },
  ];
  const load = modules({
    "node:fs": { existsSync: () => true },
    "node:child_process": {
      execFile: (bin, args, options, callback) => {
        calls.push({ bin, args, options });
        if (bin.endsWith("macos-windows-v1") && args[0] === "list") {
          callback(
            null,
            JSON.stringify([
              {
                ...native,
                id: 20400,
                pid: 41234,
                app: "Safari",
                title: "Apple",
                space: 2,
                subrole: "AXStandardWindow",
              },
            ]),
            "",
          );
          return;
        }
        if (bin.endsWith("webkit-ax-v1") && args[0] === "list") {
          callback(null, JSON.stringify(axWindowsOutput), "");
          return;
        }
        if (bin.endsWith("webkit-ax-v1") && args[0] === "focus") {
          callback(null, "ok", "");
          return;
        }
        callback(null, "[]", "");
      },
    },
  });

  const registry = load("src/browsers/registry.ts");
  const client = load("src/browsers/client.ts");

  const safari = registry.getBrowserByAppName("Safari");
  const orion = registry.getBrowserByAppName("Orion");
  assert.equal(safari?.id, "safari");
  assert.equal(safari?.engine, "webkit");
  assert.equal(orion?.id, "orion");
  assert.equal(orion?.engine, "webkit");

  const singleNative = [{ ...native, id: 20400, pid: 41234, app: "Safari", space: 2 }];
  assert.deepEqual(await client.getBrowserSummary(safari, singleNative), {
    windows: 1,
    tabs: 2,
  });

  const windows = await client.getBrowserWindows(safari, singleNative);
  assert.equal(windows.length, 1);
  assert.equal(windows[0].space, 2);
  assert.equal(windows[0].tabs.length, 2);

  calls.length = 0;
  await client.focusBrowserTab(safari, windows[0], windows[0].tabs[1]);
  assert(
    calls.some(
      ({ bin, args }) =>
        bin.endsWith("webkit-ax-v1") &&
        args[0] === "focus" &&
        args[1] === "Safari" &&
        args[2] === "20400" &&
        args[3] === "20400:1" &&
        args[4] === "WebKit" &&
        args[5] === "41234",
    ),
  );

  calls.length = 0;
  const multiOrion = [
    { ...native, id: 30001, app: "Orion", space: 1 },
    { ...native, id: 30002, app: "Orion", space: 2 },
  ];
  assert.deepEqual(await client.getBrowserSummary(orion, multiOrion), {
    windows: 2,
  });
  assert.equal(calls.length, 0);
});

test("AX subpage refresh updates its own snapshot and remains available when empty", async () => {
  const states: MockValue[] = [];
  let cursor = 0,
    response = "3\x1fAXStandardWindow\x1fRenamed\x1e",
    focused: MockValue;
  const component = (name: string) => Object.assign(() => {}, { Item: `${name}.Item`, EmptyView: `${name}.EmptyView` });
  const ui = {
    Action: component("Action"),
    ActionPanel: component("ActionPanel"),
    List: component("List"),
    Icon: { Repeat: "repeat" },
    Keyboard: { Shortcut: { Common: { Refresh: { modifiers: ["cmd"], key: "r" } } } },
  };
  const { AXWindowsView } = modules({
    "@raycast/api": ui,
    react: {
      useState: (initial) => {
        const i = cursor++;
        if (!(i in states)) states[i] = initial;
        return [
          states[i],
          (value: MockValue) => {
            states[i] = value;
          },
        ];
      },
      useMemo: (fn) => fn(),
      useEffect: () => {},
    },
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    "node:child_process": {
      execFile: (_bin, _args, _options, callback) => callback(null, response, ""),
    },
  })("src/app-windows.tsx");
  const props = {
    app,
    windows: [ax],
    onFocus: async (window: MockValue) => {
      focused = window;
    },
    onRefresh: () => {},
  };
  function render() {
    cursor = 0;
    return AXWindowsView(props);
  }
  function find(node: MockValue, predicate: (node: TestNode) => boolean): MockValue {
    if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean);
    if (!node || typeof node !== "object") return;
    if (predicate(node)) return node;
    return find(node.props?.children, predicate) || find(node.props?.actions, predicate);
  }
  const action = (tree: TestNode, title: string) =>
    find(tree, (node) => node.type === ui.Action && node.props.title === title);
  let tree = render();
  await action(tree, "Refresh List").props.onAction();
  tree = render();
  assert(find(tree, (node) => node.type === ui.List.Item && node.props.title === "Renamed"));
  await action(tree, "Focus Window").props.onAction();
  assert.equal(focused.index, 3);
  response = "";
  await action(tree, "Refresh List").props.onAction();
  tree = render();
  assert(find(tree, (node) => node.type === ui.List.EmptyView));
  assert(action(tree, "Refresh List"));
});

test("off-space app records produce an app action that restores UI only after a successful empty AX query", async () => {
  const fallbackWindows = [101, 102].map((id) => ({
    ...native,
    id,
    app: "Fixture App",
    title: "",
    space: 0,
    bundlePath: "/Applications/Fixture App.app",
    localizedName: "Fixture App",
    "has-ax-reference": false,
  }));
  let snapshot: MockValue;
  await modules()("src/window-data.ts").loadWindowData(
    (value: MockValue) => {
      snapshot = value;
    },
    {
      queryWindows: async () => fallbackWindows,
      getRunningApplicationMetadata: async () => ({}),
      queryAXWindows: async () => [],
      getBrowserSummary: async () => {
        throw new Error("Unexpected browser");
      },
    },
  );
  const ops = operations({
    queryWindows: async () => fallbackWindows,
    queryAXWindows: async () => {
      ops.calls.push("query-ax");
      return [];
    },
  });
  const view = renderer(snapshot, {
    "@raycast/api": {
      closeMainWindow: async () => {
        ops.calls.push("closed");
      },
      showToast: async () => {
        throw new Error("Unexpected failure toast");
      },
    },
    "./window-focus": { activateApplication: (group) => activateApplication(group, ops) },
  });
  const item = findAll(
    view.render(),
    (node) => node.type === view.ui.List.Item && node.props.title === "Fixture App",
  )[0];
  assert(item, "An app must remain in the root menu even though its CG windows are off-space and have no AX reference");
  assert.equal(item.props.subtitle, "");
  const action = findAll(item, (node) => node.type === view.ui.Action && node.props.title === "Show Application")[0];
  assert(action);
  await action.props.onAction();
  assert.deepEqual(ops.calls, ["query-ax", "reopen", "closed"]);
});
