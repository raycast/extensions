import type { MockValue, MockModules } from "./load-ts.ts";
import type { TestNode } from "./render-ui.ts";
import assert from "node:assert/strict";
import test from "node:test";
import createLoader from "./load-ts.ts";
import { renderer, findAll } from "./render-ui.ts";

const native = (pid: number, app: string, extra = {}) => ({
  id: pid * 10,
  pid,
  app,
  localizedName: app,
  bundlePath: `/Applications/${app}.app`,
  title: `${app} window`,
  space: 1,
  frame: { x: 0, y: 0, w: 800, h: 600 },
  "has-ax-reference": true,
  ...extra,
});
const snapshot = (windows: ReturnType<typeof native>[], extra = {}) => ({
  windows,
  applications: [],
  applicationOrder: [],
  metadataByPid: {},
  browserCounts: {},
  browserTabs: {},
  axWindowsByPid: {},
  ...extra,
});
const items = (view: ReturnType<typeof renderer>, tree: TestNode) =>
  findAll(tree, (node) => node.type === view.ui.List.Item);
const action = (view: ReturnType<typeof renderer>, row: TestNode, title: string) =>
  findAll(row, (node) => node.type === view.ui.Action && node.props.title === title)[0];

test("cold loading stays in the list and never claims there are no apps or search results", () => {
  let isLoading = true;
  const view = renderer(snapshot([]), {
    "./use-window-search": {
      useWindowSearch: () => ({ ...snapshot([]), isLoading, setWindows() {}, refreshWindows() {} }),
    },
  });
  for (const query of ["", "notes"]) {
    view.render().props.onSearchTextChange(query);
    const loading = view.render();
    assert.equal(loading.type, view.ui.List);
    assert.equal(loading.props.isLoading, false, "Raycast must not hide the loading EmptyView behind its loading bar");
    const empty = findAll(loading, (node) => node.type === view.ui.List.EmptyView)[0];
    assert.equal(empty.props.title, "Getting things ready…");
    assert.equal(empty.props.icon, view.ui.Icon.AppWindow);
  }
  isLoading = false;
  const noResults = findAll(view.render(), (node) => node.type === view.ui.List.EmptyView)[0];
  assert.equal(noResults.props.title, "No Results");
  assert.match(noResults.props.description, /Try another/);
  view.render().props.onSearchTextChange("");
  const noApps = findAll(view.render(), (node) => node.type === view.ui.List.EmptyView)[0];
  assert.equal(noApps.props.title, "No Running Applications");
  assert.match(noApps.props.description, /refresh/);
});

test("cached applications remain visible while their snapshot refreshes", () => {
  const data = snapshot([native(1, "Notes")]);
  const view = renderer(data, {
    "./use-window-search": {
      useWindowSearch: () => ({ ...data, isLoading: true, setWindows() {}, refreshWindows() {} }),
    },
  });
  const tree = view.render();
  assert.equal(tree.props.isLoading, true);
  assert.deepEqual(
    items(view, tree).map((row) => row.props.title),
    ["Notes"],
  );
  assert.equal(findAll(tree, (node) => node.type === view.ui.List.EmptyView).length, 0);
});

test("background updates keep selected app positions and never replace a vanished target with another action", () => {
  const data = { ...snapshot([native(1, "Notes"), native(2, "Editor")]), applicationOrder: [1, 2] };
  const view = renderer(data);
  const first = view.render();
  const selected = items(view, first)[0].props.id;
  first.props.onSelectionChange(selected);
  data.applicationOrder = [2, 3, 1];
  data.windows = [native(1, "Notes"), native(2, "Editor"), native(3, "Mail")];
  const updated = view.render();
  assert.deepEqual(
    items(view, updated).map((row) => row.props.title),
    ["Notes", "Editor", "Mail"],
  );
  assert.equal(updated.props.selectedItemId, selected);
  data.windows = [native(2, "Editor"), native(3, "Mail")];
  const missing = view.render();
  const placeholder = items(view, missing)[0];
  assert.equal(placeholder.props.id, selected);
  assert.equal(placeholder.props.subtitle, "No longer available");
  assert.equal(action(view, placeholder, "Activate Application"), undefined);
  assert.equal(missing.props.selectedItemId, selected);
  action(view, placeholder, "Refresh List").props.onAction();
  const refreshed = view.render();
  assert.deepEqual(
    items(view, refreshed).map((row) => row.props.title),
    ["Editor", "Mail"],
  );
  assert.equal(refreshed.props.selectedItemId, undefined);
});

test("cached rows stay visible while setup is checked but cannot activate until ready", () => {
  let kind = "checking";
  const enabled: boolean[] = [];
  const data = snapshot([native(1, "Notes")]);
  const view = renderer(data, {
    "./runtime-environment": { useRuntimeEnvironment: () => ({ status: { kind }, revalidate() {} }) },
    "./use-window-search": {
      useWindowSearch: (value) => {
        enabled.push(value);
        return { ...data, isLoading: false, refreshWindows() {}, setWindows() {} };
      },
    },
  });
  const checking = view.render();
  assert.deepEqual(
    items(view, checking).map((row) => row.props.title),
    ["Notes"],
  );
  assert.equal(findAll(checking, (node) => node.type === view.ui.List.EmptyView).length, 0);
  assert.equal(items(view, checking)[0].props.actions, undefined);
  assert.equal(enabled.at(-1), false);
  checking.props.onSearchTextChange("Notes window");
  const cachedSearch = items(view, view.render());
  assert.equal(cachedSearch.length, 1);
  assert.equal(
    cachedSearch[0].props.actions,
    undefined,
    "cached window results cannot focus before permission is checked",
  );
  view.render().props.onSearchTextChange("");
  kind = "ready";
  const ready = view.render();
  assert.deepEqual(
    items(view, ready).map((row) => row.props.title),
    ["Notes"],
  );
  assert(action(view, items(view, ready)[0], "Activate Application"));
  assert.equal(enabled.at(-1), true);
  kind = "accessibility";
  assert.match(view.render().props.markdown, /Allow Accessibility Access/);
  assert.equal(enabled.at(-1), false);
});

test("the local loading preview stays visible with cached apps and never starts window discovery", () => {
  const data = snapshot([native(1, "Notes")]);
  const enabled: boolean[] = [];
  const view = renderer(
    data,
    {
      "./use-window-search": {
        useWindowSearch: (value) => {
          enabled.push(value);
          return { ...data, isLoading: false };
        },
      },
    },
    "src/app-hopper.tsx",
    "default",
    { launchContext: { preview: "loading" } },
  );
  for (let i = 0; i < 2; i++) {
    const tree = view.render();
    assert.equal(tree.props.isLoading, false);
    assert.equal(items(view, tree).length, 0);
    assert.equal(findAll(tree, (node) => node.type === view.ui.List.EmptyView)[0].props.title, "Getting things ready…");
  }
  assert.deepEqual(enabled, [false, false]);
});

test("root apps share one MRU list across browser, minimized, hidden, and windowless states", () => {
  const view = renderer(
    snapshot(
      [
        native(1, "Google Chrome", { frontOrder: 0 }),
        native(2, "Editor", { space: 0, isMinimized: true, frontOrder: 8 }),
        native(3, "Mail", { space: 0, isHidden: true, frontOrder: 4 }),
      ],
      {
        applicationOrder: [2, 4, 1, 3],
        applications: [{ pid: 4, localizedName: "Notes", bundlePath: "/Applications/Notes.app", isHidden: false }],
        axWindowsByPid: { 4: [] },
      },
    ),
  );
  const tree = view.render();
  assert.equal(findAll(tree, (node) => node.type === view.ui.List.Section).length, 0);
  const rows = items(view, tree);
  assert.deepEqual(
    rows.map((row) => row.props.title),
    ["Editor", "Notes", "Google Chrome", "Mail"],
  );
  assert.equal(rows[0].props.accessories, undefined);
  assert.equal(rows[3].props.accessories, undefined);
  assert.equal(rows[1].props.subtitle, "");
  assert(action(view, rows[1], "Show Application"));
  assert.equal(action(view, rows[0], "Activate Application").props.title, "Activate Application");
});

test("content search exposes focusable windows with MRU ordering for equal relevance", () => {
  const view = renderer(
    snapshot(
      [
        native(1, "Google Chrome", { title: "Project docs" }),
        native(2, "Editor", { title: "Project source" }),
        native(2, "Editor", { id: 21, title: "Project notes" }),
      ],
      { applicationOrder: [2, 1] },
    ),
  );
  view.render().props.onSearchTextChange("project");
  const rows = items(view, view.render());
  assert.deepEqual(
    rows.map((row) => row.props.title),
    ["Project source", "Project notes", "Project docs"],
  );
  assert.equal(rows[0].props.subtitle, "Editor");
  assert(action(view, rows[0], "Focus Window"));
  assert(findAll(rows[0], (node) => node.type === view.ui.Action.Push && node.props.title === "Show Windows")[0]);
  assert(
    findAll(
      rows[2],
      (node) => node.type === view.ui.Action.Push && node.props.title === "Show Browser Tabs and Windows",
    )[0],
  );
});

test("one browser window skips the window layer, while multiple windows remain selectable", () => {
  const browser = {
    id: "chrome",
    appName: "Google Chrome",
    appPath: "/Applications/Google Chrome.app",
    engine: "chromium",
  };
  const windows = [{ id: "10", title: "Work", tabs: [{ id: "10:0", title: "Docs", url: "https://example.com" }] }];
  const single = renderer({ browserWindows: windows }, {}, "src/browser-windows.tsx", "BrowserWindowsView", {
    browser,
  });
  assert.deepEqual(
    items(single, single.render()).map((row) => row.props.title),
    ["Docs"],
  );
  const multiple = renderer(
    { browserWindows: [...windows, { id: "20", title: "Other", tabs: [] }] },
    {},
    "src/browser-windows.tsx",
    "BrowserWindowsView",
    { browser },
  );
  assert.deepEqual(
    items(multiple, multiple.render()).map((row) => row.props.title),
    ["Work", "Other"],
  );
});

test("same-bundle processes merge once and unranked apps fall back to front order rather than Space", () => {
  const { groupApplications } = createLoader({})("src/app-groups.ts");
  const windows = [native(1, "One", { frontOrder: 8, space: 0 }), native(2, "Two", { frontOrder: 1, space: 4 })];
  assert.deepEqual(
    groupApplications(windows, {}).map((app: { name: string }) => app.name),
    ["Two", "One"],
  );
  const groups = groupApplications(
    [native(1, "One", { bundlePath: undefined })],
    {},
    [2, 1],
    [
      { pid: 1, localizedName: "One", bundlePath: "/Applications/One.app" },
      { pid: 2, localizedName: "One", bundlePath: "/Applications/One.app" },
    ],
  );
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].pids, [1, 2]);
  assert.equal(groups[0].windows.length, 1);
});

test("Space zero stays unlabeled unless an actual state is known", () => {
  const { getWindowAccessories } = createLoader({ "@raycast/api": { Icon: { Minus: "minus" } } })(
    "src/helpers/window-presentation.ts",
  );
  assert.deepEqual(getWindowAccessories({ space: 0 }), []);
  assert.deepEqual(getWindowAccessories({ space: 2, isMinimized: true, isHidden: true }), [
    { icon: "minus", tooltip: "Minimized" },
    { text: "Space 2" },
  ]);
});

test("macOS app ordering batches PID lookups and skips missing or duplicate entries", async () => {
  const calls: MockValue[] = [];
  const { getApplicationOrder } = createLoader({
    "./applescript": {
      execBinary: async (binary, args) => {
        calls.push({ binary, args });
        return {
          stdout:
            calls.length === 1
              ? "ASN:0x0-0x123: ASN:0x0-0x456: ASN:0x0-0x789:"
              : "pid = 42\n[ NULL ]\npid = 7\npid = 42\n",
        };
      },
    },
  })("src/helpers/app-order.ts");
  assert.deepEqual(await getApplicationOrder(), [42, 7]);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].args, [
    "info",
    "-only",
    "pid",
    "ASN:0x0-0x123:",
    "info",
    "-only",
    "pid",
    "ASN:0x0-0x456:",
    "info",
    "-only",
    "pid",
    "ASN:0x0-0x789:",
  ]);
});

test("windowless apps verify the live process and successful AX query before reopening", async () => {
  const { activateApplication } = createLoader({})("src/window-focus.ts");
  const app = { id: "notes", name: "Notes", bundlePath: "/Applications/Notes.app", pids: [4], windows: [] };
  const calls: MockValue[] = [];
  const ops = {
    getRunningApplications: async () => [{ pid: 4, bundlePath: app.bundlePath }],
    queryAXWindows: async () => [],
    requestApplicationWindow: async () => {
      calls.push("reopen");
    },
  };
  assert.equal(await activateApplication(app, ops), "focused");
  assert.deepEqual(calls, ["reopen"]);
  calls.length = 0;
  await assert.rejects(
    activateApplication(app, {
      ...ops,
      queryAXWindows: async () => {
        throw new Error("Permission denied");
      },
    }),
    /Permission denied/,
  );
  assert.equal(
    await activateApplication(app, {
      ...ops,
      getRunningApplications: async () => [{ pid: 4, bundlePath: "/Applications/Other.app" }],
    }),
    "missing",
  );
  assert.deepEqual(calls, []);
});

test("a browser with no tab windows offers the app action rather than an empty drill-down", () => {
  const view = renderer(snapshot([native(1, "Google Chrome")], { browserCounts: { chrome: { windows: 0 } } }));
  const row = items(view, view.render())[0];
  assert(action(view, row, "Show Application"));
  assert.equal(findAll(row, (node) => node.type === view.ui.Action.Push).length, 0);
});

test("windowless Firefox and Zen retain integration setup in the app list and app-name search", () => {
  const IntegrationAction = () => {};
  for (const [name, browserId] of [
    ["Firefox", "firefox"],
    ["Zen", "zen"],
  ]) {
    const view = renderer(
      snapshot([], {
        applications: [{ pid: 1, localizedName: name, bundlePath: `/Applications/${name}.app` }],
        browserCounts: { [browserId]: { windows: 0 } },
        axWindowsByPid: { 1: [] },
      }),
      { "./firefox-integration": { FirefoxIntegrationAction: IntegrationAction } },
    );
    for (const query of ["", name]) {
      view.render().props.onSearchTextChange(query);
      const [row] = items(view, view.render());
      assert(action(view, row, "Show Application"));
      const [integration] = findAll(row, (node) => node.type === IntegrationAction);
      assert(integration, `${name} should offer integration setup without an open window`);
      assert.equal(integration.props.browserId, browserId);
    }
  }
});

test("browsers missing native windows keep AX navigation and focus the chosen window", async () => {
  const { loadWindowData } = createLoader({})("src/window-data.ts");
  const IntegrationAction = () => {};
  for (const name of ["Safari", "Google Chrome", "Firefox", "Zen"]) {
    const application = { pid: 20, localizedName: name, bundlePath: `/Applications/${name}.app` };
    const axWindows = [
      { pid: 20, index: 1, title: "First", subrole: "AXStandardWindow" },
      { pid: 20, index: 2, title: "Second", subrole: "AXStandardWindow" },
    ];
    const snapshots: MockValue[] = [];
    await loadWindowData((data: MockValue) => snapshots.push(data), {
      queryWindows: async () => [],
      getRunningApplications: async () => [application],
      getRunningApplicationMetadata: async () => ({}),
      queryAXWindows: async () => axWindows,
      getBrowserSummary: async () => {
        throw new Error("Unexpected browser query");
      },
    });
    const focused: MockValue[] = [];
    const view = renderer(snapshots.at(-1), {
      "./windows": { raiseAXWindow: async (window: MockValue) => focused.push(window) },
      "./firefox-integration": { FirefoxIntegrationAction: IntegrationAction },
    });
    for (const query of ["", name]) {
      view.render().props.onSearchTextChange(query);
      const [row] = items(view, view.render());
      assert.equal(row.props.subtitle, "2 windows", name);
      assert.equal(action(view, row, "Show Application"), undefined, name);
      const [push] = findAll(row, (node) => node.type === view.ui.Action.Push && node.props.title === "Show Windows");
      assert(push, `${name} must expose its AX windows`);
      const target = push.props.target;
      const child = renderer({}, {}, "src/app-windows.tsx", "AXWindowsView", target.props);
      const windows = items(child, child.render());
      assert.deepEqual(
        windows.map((window) => window.props.title),
        ["First", "Second"],
      );
      await action(child, windows[1], "Focus Window").props.onAction();
      assert.equal(focused.at(-1), axWindows[1], `${name} must focus the selected AX target`);
      if (name === "Firefox" || name === "Zen") {
        const [integration] = findAll(row, (node) => node.type === IntegrationAction);
        assert.equal(integration?.props.browserId, name.toLowerCase());
      }
    }
  }
});

test("resolved browser data keeps browser navigation ahead of AX fallback without native windows", () => {
  const browserWindows = [{ id: "session:1", title: "Work", tabs: [] }];
  for (const data of [{ browserCounts: { firefox: { windows: 1 } } }, { browserTabs: { firefox: browserWindows } }]) {
    const view = renderer(
      snapshot([], {
        applications: [{ pid: 20, localizedName: "Firefox", bundlePath: "/Applications/Firefox.app" }],
        axWindowsByPid: { 20: [{ pid: 20, index: 1, title: "Work" }] },
        ...data,
      }),
    );
    const [row] = items(view, view.render());
    assert.equal(action(view, row, "Focus Window"), undefined);
    const [push] = findAll(
      row,
      (node) => node.type === view.ui.Action.Push && node.props.title === "Show Browser Tabs and Windows",
    );
    assert(push, "a browser scan or companion result must retain browser navigation");
  }
});

test("application enrichment publishes independently and checks AX only for apps missing native windows", async () => {
  const { loadWindowData } = createLoader({})("src/window-data.ts");
  const snapshots: MockValue[] = [],
    queried: number[] = [];
  let finishApps!: (apps: { pid: number; localizedName: string }[]) => void;
  const pending = new Promise<{ pid: number; localizedName: string }[]>((resolve) => {
    finishApps = resolve;
  });
  const loading = loadWindowData((data: MockValue) => snapshots.push(data), {
    queryWindows: async () => [native(1, "Editor")],
    getRunningApplicationMetadata: async () => ({}),
    getRunningApplications: () => pending,
    getApplicationOrder: async () => [2, 1],
    getBrowserSummary: async () => {
      throw new Error("Unexpected browser");
    },
    queryAXWindows: async (pid: number) => {
      queried.push(pid);
      return [];
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(snapshots[0].windows.length, 1);
  assert.deepEqual(snapshots.at(-1).applicationOrder, [2, 1]);
  finishApps([
    { pid: 1, localizedName: "Editor" },
    { pid: 2, localizedName: "Notes" },
  ]);
  await loading;
  assert.deepEqual(queried, [2]);
  assert.equal(snapshots.at(-1).applications.length, 2);
  assert.deepEqual(snapshots.at(-1).axWindowsByPid[2], []);
});

test("AX window state is read explicitly and unknown state is preserved", async () => {
  const separator = "\x1f",
    end = "\x1e";
  let output = ["v2", "2", "AXStandardWindow", "true", "false", "Document"].join(separator) + end;
  const { queryAXWindows } = createLoader({ "./helpers/applescript": { runAppleScript: async () => output } })(
    "src/windows.ts",
  );
  const [window] = await queryAXWindows(20);
  assert.equal(window.index, 2);
  assert.equal(window.title, "Document");
  assert.equal(window.isMinimized, true);
  assert.equal(window.isHidden, false);
  output = ["v2", "2", "AXStandardWindow", "", "", "Unknown"].join(separator) + end;
  const [unknown] = await queryAXWindows(20);
  assert.equal(unknown.isMinimized, undefined);
  assert.equal(unknown.isHidden, undefined);
});

test("browser window state follows native window IDs and never guesses a bridge window by position", async () => {
  const windows = [
    { id: "20", title: "Second", tabs: [] },
    { id: "10", title: "First", tabs: [] },
    { id: "session:10", title: "Bridge", tabs: [] },
    { id: "session:20", nativeWindowId: "20", title: "Reconciled bridge", tabs: [] },
  ];
  const { getBrowserWindows } = createLoader({ "./native": { getNativeBrowserWindows: async () => windows } })(
    "src/browsers/client.ts",
  );
  const result = await getBrowserWindows({ appName: "Test Browser", engine: "webkit" }, [
    native(1, "Test Browser", { id: 10, space: 2, isHidden: true, isMinimized: true }),
    native(1, "Test Browser", { id: 20, space: 3, isHidden: true, isMinimized: false }),
  ]);
  assert.equal(result[0].isMinimized, false);
  assert.equal(result[0].space, 3);
  assert.equal(result[1].isMinimized, true);
  assert.equal(result[1].space, 2);
  assert.equal(result[2].isMinimized, undefined);
  assert.equal(result[2].space, undefined);
  assert.equal(result[2].isHidden, true);
  assert.equal(result[3].isMinimized, false);
  assert.equal(result[3].space, 3);
});

test("mixed browser windows show only the total count in the root list", () => {
  const view = renderer(
    snapshot(
      [
        native(1, "Safari", { id: 10, isMinimized: false }),
        native(1, "Safari", { id: 11, space: 0, isMinimized: true }),
      ],
      {
        browserCounts: { safari: { windows: 2 } },
        browserTabs: {
          safari: [
            { id: "10", title: "Start Page", space: 2, isMinimized: false, tabs: [] },
            { id: "11", title: "Work", isMinimized: true, tabs: [] },
          ],
        },
      },
    ),
  );
  const row = items(view, view.render())[0];
  assert.equal(row.props.subtitle, "2 windows");
  assert.equal(row.props.accessories, undefined);
});

test("app rows show known Space only when the resolved application has exactly one window", () => {
  const cases = [
    {
      name: "single native window",
      windows: [native(1, "Editor", { space: 2 })],
      expected: "Space 2",
    },
    {
      name: "single native window with unknown Space",
      windows: [native(1, "Editor", { space: 0 })],
    },
    {
      name: "multiple native windows in the same Space",
      windows: [native(1, "Editor", { id: 10, space: 2 }), native(1, "Editor", { id: 11, space: 2 })],
    },
    {
      name: "browser summary reveals multiple windows",
      windows: [native(1, "Safari", { space: 2 })],
      data: { browserCounts: { safari: { windows: 2 } } },
    },
    {
      name: "single resolved browser window",
      windows: [native(1, "Safari", { space: 0 })],
      data: {
        browserCounts: { safari: { windows: 1, tabs: 0 } },
        browserTabs: { safari: [{ id: "10", title: "Work", space: 3, tabs: [] }] },
      },
      expected: "Space 3",
    },
    {
      name: "bridge-only browser window does not borrow a native Space",
      windows: [native(1, "Firefox", { space: 2 })],
      data: {
        browserCounts: { firefox: { windows: 1, tabs: 0 } },
        browserTabs: { firefox: [{ id: "session:10", title: "Work", tabs: [] }] },
      },
    },
    {
      name: "AX fallback reveals multiple windows",
      windows: [native(1, "Editor", { space: 2, "has-ax-reference": false })],
      data: {
        axWindowsByPid: {
          1: [
            { pid: 1, index: 1, title: "One" },
            { pid: 1, index: 2, title: "Two" },
          ],
        },
      },
    },
    {
      name: "unresolved AX windows do not claim a single known Space",
      windows: [native(1, "Editor", { space: 2, "has-ax-reference": false })],
    },
    {
      name: "windowless app",
      windows: [],
      data: { applications: [{ pid: 1, localizedName: "Editor", bundlePath: "/Applications/Editor.app" }] },
    },
  ];
  for (const scenario of cases) {
    const view = renderer(snapshot(scenario.windows, scenario.data));
    const row = items(view, view.render())[0];
    const expected = scenario.expected ? [{ text: scenario.expected }] : undefined;
    assert.deepEqual(row.props.accessories, expected, scenario.name);
    view.render().props.onSearchTextChange(row.props.title);
    assert.deepEqual(items(view, view.render())[0].props.accessories, expected, `${scenario.name}: app-name search`);
  }
});

test("browser cache keys change with the window snapshot instead of reusing a stale single-window layout", () => {
  const { createBrowserSnapshot } = createLoader({})("src/browsers/snapshot.ts");
  const requests: { args: MockValue[]; options: { keepPreviousData: boolean } }[] = [];
  const mocks: MockModules = {
    "@raycast/utils": {
      useCachedPromise: (_fn, args, options) => {
        requests.push({ args, options });
        return { data: [], isLoading: true, revalidate() {} };
      },
    },
  };
  const browser = { id: "safari", appName: "Safari", engine: "webkit" };
  for (const initialNativeWindows of [
    [native(1, "Safari")],
    [native(1, "Safari"), native(1, "Safari", { id: 11, isMinimized: true })],
  ]) {
    renderer({}, mocks, "src/browser-windows.tsx", "BrowserWindowsView", {
      browser,
      initialSnapshot: createBrowserSnapshot(browser, { nativeWindows: initialNativeWindows }),
    }).render();
  }
  assert.notEqual(requests[0].args[1], requests[1].args[1]);
  assert.equal(requests[1].options.keepPreviousData, false);
});
