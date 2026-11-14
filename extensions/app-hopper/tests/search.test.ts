import type { MockValue } from "./load-ts.ts";
import type { TestNode } from "./render-ui.ts";
import assert from "node:assert/strict";
import test from "node:test";
import createLoader from "./load-ts.ts";
import { renderer, findAll } from "./render-ui.ts";

const safari = { id: "safari", appName: "Safari", appPath: "/Applications/Safari.app", engine: "webkit" };
const windows = [
  {
    id: "10",
    title: "Work",
    tabs: [
      { id: "10:ax:one", title: "GitHub project", url: "https://github.com/one" },
      { id: "10:ax:two", title: "Reference", url: "https://docs.example.com" },
    ],
  },
  {
    id: "11",
    title: "Personal",
    tabs: [
      { id: "11:ax:one", title: "VS Code docs", url: "https://code.example.com" },
      { id: "11:ax:two", title: "GitHub project", url: "https://github.com/two" },
    ],
  },
];
const native = (id: number, pid: number, app: string, title: string) => ({
  id,
  pid,
  app,
  localizedName: app,
  title,
  bundlePath: `/Applications/${app}.app`,
  "has-ax-reference": true,
  space: 1,
});
const snapshot = {
  windows: [native(10, 1, "Safari", "Work"), native(11, 1, "Safari", "Personal"), native(20, 2, "Code", "Editor")],
  metadataByPid: {},
  applicationOrder: [1, 2],
  browserCounts: { safari: { windows: 2 } },
  browserTabs: { safari: windows },
  axWindowsByPid: {},
};
const rows = (view: ReturnType<typeof renderer>, tree: TestNode) =>
  findAll(tree, (node) => node.type === view.ui.List.Item);
const sections = (view: ReturnType<typeof renderer>, tree: TestNode) =>
  findAll(tree, (node) => node.type === view.ui.List.Section).map((section) => ({
    title: section.props.title,
    rows: rows(view, section).map((row) => row.props.title),
  }));
const push = (view: ReturnType<typeof renderer>, row: TestNode, title: string) =>
  findAll(row, (node) => node.type === view.ui.Action.Push && node.props.title === title)[0];
function search(view: ReturnType<typeof renderer>, query: string) {
  view.render().props.onSearchTextChange(query);
  return rows(view, view.render());
}
function tabsView(target: TestNode) {
  return renderer({}, {}, "src/browser-windows.tsx", "BrowserTabsView", target.props);
}

test("root multi-term search crosses app, window and tab fields and switches the exact duplicate-title tab", async () => {
  const focused: MockValue[][] = [],
    closed: MockValue[] = [];
  const view = renderer(snapshot, {
    "./browsers/client": { focusBrowserTab: async (...args) => focused.push(args) },
  });
  view.ui.closeMainWindow = async (options: MockValue) => {
    assert.equal(focused.length, 1, "only end the command after the tab has been focused");
    closed.push(options);
  };
  const hits = search(view, "safari personal github");
  assert.deepEqual(
    hits.map((row) => row.props.subtitle.value),
    ["github.com/two"],
  );
  const action = findAll(hits[0], (node) => node.type === view.ui.Action && node.props.title === "Switch to Tab")[0];
  await action.props.onAction();
  assert.equal(focused[0][1].id, "11");
  assert.equal(focused[0][2].id, "11:ax:two");
  assert.deepEqual(closed, [{ popToRootType: "immediate" }]);
  assert.equal(search(view, "safari missing github").length, 0);
});

test("failed tab focus keeps the current command open for retry", async () => {
  const closed: MockValue[] = [];
  const toasts: MockValue[] = [];
  const view = renderer(snapshot, {
    "./browsers/client": {
      focusBrowserTab: async () => {
        throw new Error("Tab unavailable");
      },
    },
  });
  view.ui.closeMainWindow = async (options: MockValue) => closed.push(options);
  view.ui.showToast = async (toast: MockValue) => toasts.push(toast);
  const [hit] = search(view, "safari personal github");
  view.render().props.onSelectionChange(hit.props.id);
  await findAll(hit, (node) => node.props.title === "Switch to Tab")[0].props.onAction();
  assert.deepEqual(closed, []);
  assert.equal(view.render().props.searchText, "safari personal github");
  assert.equal(view.render().props.selectedItemId, hit.props.id);
  assert.equal(toasts[0].title, "Failed to switch tab");
});

test("app-name matches retain matching content in other apps; titles still rank above URLs", () => {
  const view = renderer(snapshot);
  const hits = search(view, "code");
  assert.deepEqual(
    hits.map((row) => row.props.title),
    ["Code", "VS Code docs"],
  );
  const { rankSearch } = createLoader({})("src/helpers/search.ts");
  const { tabSearchFields } = createLoader({})("src/search-results.ts");
  const tabs = [
    { title: "Reference", url: "https://github.com", id: "url" },
    { title: "GitHub", url: "https://example.com", id: "title" },
  ];
  assert.deepEqual(
    rankSearch(tabs, "github", (tab: MockValue) => tabSearchFields(tab, "Safari", "Work")).map((t: MockValue) => t.id),
    ["title", "url"],
  );
});

test("root search separates applications from content, names browser sources, and omits empty sections", () => {
  const view = renderer({
    ...snapshot,
    windows: [...snapshot.windows, native(21, 2, "Code", "Code review")],
  });
  const hits = search(view, "code");
  assert.deepEqual(sections(view, view.render()), [
    { title: "Applications", rows: ["Code"] },
    { title: "Tabs and Windows", rows: ["Code review", "VS Code docs"] },
  ]);
  assert.equal(hits[1].props.subtitle, "Code", "native windows retain their app source");
  assert.equal(hits[2].props.subtitle.value, "code.example.com", "tab URLs remain visible");
  assert.deepEqual(hits[2].props.accessories[0], { text: "Safari", tooltip: "Tab in Safari" });
  search(view, "safari");
  assert.deepEqual(sections(view, view.render()), [{ title: "Applications", rows: ["Safari"] }]);
  search(view, "github");
  assert.deepEqual(sections(view, view.render()), [
    { title: "Tabs and Windows", rows: ["GitHub project", "GitHub project"] },
  ]);
  search(view, "nothing-matches");
  assert.deepEqual(sections(view, view.render()), []);
});

test("root search collapses a single same-named native window into the app and keeps activation working", async () => {
  for (const title of ["Herdr", " herdr ", "Ｈｅｒｄｒ"]) {
    const activated: MockValue[] = [];
    const view = renderer(
      { ...snapshot, windows: [native(30, 3, "Herdr", title)] },
      {
        "./window-focus": {
          activateApplication: async (app) => {
            activated.push(app);
            return "focused";
          },
        },
      },
    );
    for (const query of ["her", "Herdr", "ＨＥＲ"]) {
      const [hit] = search(view, query);
      assert.deepEqual(
        sections(view, view.render()),
        [{ title: "Applications", rows: ["Herdr"] }],
        `${title}: ${query}`,
      );
      const action = findAll(hit, (node) => node.props.title === "Activate Application")[0];
      await action.props.onAction();
      assert.equal(activated.at(-1).windows[0].id, 30);
    }
  }
});

test("root search collapses a single same-named AX fallback window and keeps its focus target", async () => {
  const window = { pid: 3, index: 1, title: "Herdr", subrole: "AXStandardWindow" };
  for (const scenario of [
    { name: "AX-only window", windows: [] },
    {
      name: "native window without an AX reference",
      windows: [{ ...native(30, 3, "Herdr", "Herdr"), "has-ax-reference": false }],
    },
  ]) {
    const focused: MockValue[] = [];
    const view = renderer(
      {
        ...snapshot,
        windows: scenario.windows,
        applications: [{ pid: 3, localizedName: "Herdr", bundlePath: "/Applications/Herdr.app" }],
        axWindowsByPid: { 3: [window] },
      },
      { "./windows": { raiseAXWindow: async (target) => focused.push(target) } },
    );
    const [hit] = search(view, "her");
    assert.deepEqual(sections(view, view.render()), [{ title: "Applications", rows: ["Herdr"] }], scenario.name);
    await findAll(hit, (node) => node.props.title === "Focus Window")[0].props.onAction();
    assert.deepEqual(focused, [window]);
  }
});

test("root search keeps differently titled windows and same-named windows when another window exists", () => {
  const first = native(30, 3, "Herdr", "Herdr");
  const fallback = { ...native(31, 3, "Herdr", "Settings"), "has-ax-reference": false };
  const otherAX = { pid: 3, index: 2, title: "Settings", subrole: "AXStandardWindow" };
  for (const data of [
    {
      name: "single window with a different title",
      windows: [native(30, 3, "Herdr", "Herdr project")],
      axWindowsByPid: {},
      expected: ["Herdr project"],
    },
    {
      name: "two same-named native windows",
      windows: [first, native(31, 3, "Herdr", "Herdr")],
      axWindowsByPid: {},
      expected: ["Herdr", "Herdr"],
    },
    {
      name: "second native window does not match the query",
      windows: [first, native(31, 3, "Herdr", "Settings")],
      axWindowsByPid: {},
      expected: ["Herdr"],
    },
    {
      name: "second native window has unresolved AX data",
      windows: [first, fallback],
      axWindowsByPid: {},
      expected: ["Herdr"],
    },
    {
      name: "native and AX fallback windows",
      windows: [first, fallback],
      axWindowsByPid: { 3: [otherAX] },
      expected: ["Herdr"],
    },
    {
      name: "additional window exists only in AX data",
      windows: [first],
      axWindowsByPid: { 3: [otherAX] },
      expected: ["Herdr"],
    },
    {
      name: "two AX fallback windows",
      windows: [fallback],
      axWindowsByPid: { 3: [{ ...otherAX, index: 1, title: "Herdr" }, otherAX] },
      expected: ["Herdr"],
    },
    {
      name: "multiple AX windows share the native window's title",
      windows: [first],
      axWindowsByPid: {
        3: [
          { ...otherAX, index: 1, title: "Herdr" },
          { ...otherAX, title: "Herdr" },
        ],
      },
      expected: ["Herdr"],
    },
  ]) {
    const view = renderer({ ...snapshot, ...data });
    search(view, "her");
    assert.deepEqual(
      sections(view, view.render()),
      [
        { title: "Applications", rows: ["Herdr"] },
        { title: "Tabs and Windows", rows: data.expected },
      ],
      data.name,
    );
  }
});

test("root search keeps same-named browser tabs alongside their app", () => {
  const view = renderer({
    ...snapshot,
    windows: [native(10, 1, "Firefox", "Firefox")],
    browserTabs: {
      firefox: [{ id: "10", title: "Firefox", tabs: [{ id: "tab:1", title: "Firefox", url: "about:home" }] }],
    },
  });
  search(view, "fire");
  assert.deepEqual(sections(view, view.render()), [
    { title: "Applications", rows: ["Firefox"] },
    { title: "Tabs and Windows", rows: ["Firefox"] },
  ]);
});

test("late app matches do not move selected content sections until the search changes", async () => {
  const tab = { id: "10:ax:one", title: "Code docs", url: "https://example.com" };
  const data = {
    ...snapshot,
    windows: [native(10, 1, "Safari", "Work")],
    browserTabs: { safari: [{ id: "10", title: "Work", tabs: [tab] }] },
  };
  const focused: MockValue[][] = [];
  const view = renderer(data, { "./browsers/client": { focusBrowserTab: async (...args) => focused.push(args) } });
  const [first] = search(view, "code");
  view.render().props.onSelectionChange(first.props.id);
  data.windows.push(native(20, 2, "Code", "Editor"));
  const updated = view.render();
  assert.deepEqual(sections(view, updated), [
    { title: "Tabs and Windows", rows: ["Code docs"] },
    { title: "Applications", rows: ["Code"] },
  ]);
  assert.equal(updated.props.selectedItemId, first.props.id);
  await findAll(rows(view, updated)[0], (node) => node.props.title === "Switch to Tab")[0].props.onAction();
  assert.equal(focused[0][2], tab);
  search(view, "code");
  assert.deepEqual(sections(view, view.render()), [
    { title: "Applications", rows: ["Code"] },
    { title: "Tabs and Windows", rows: ["Code docs"] },
  ]);
});

test("root chatgpt search includes the app and every matching URL across browser windows", async () => {
  const focused: MockValue[][] = [];
  const view = renderer(
    {
      ...snapshot,
      windows: [...snapshot.windows, native(30, 3, "ChatGPT", "Conversation")],
      applicationOrder: [3, 1, 2],
      browserTabs: {
        safari: [
          {
            id: "10",
            title: "Work",
            tabs: [
              { id: "10:0", title: "Daily lesson", url: "https://chatgpt.com/c/one" },
              { id: "10:1", title: "Unrelated", url: "https://example.com" },
            ],
          },
          {
            id: "11",
            title: "Personal",
            tabs: [
              { id: "11:0", title: "Interview prep", url: "https://chatgpt.com/c/two" },
              { id: "11:1", title: "ChatGPT help", url: "https://help.example.com" },
            ],
          },
        ],
      },
    },
    { "./browsers/client": { focusBrowserTab: async (...args) => focused.push(args) } },
  );
  const hits = search(view, "chatgpt");
  assert.deepEqual(
    hits.map((row) => row.props.title),
    ["ChatGPT", "ChatGPT help", "Daily lesson", "Interview prep"],
  );
  assert.deepEqual(
    hits.slice(2).map((row) => row.props.subtitle.value),
    ["chatgpt.com/c/one", "chatgpt.com/c/two"],
  );
  const action = findAll(hits[3], (node) => node.type === view.ui.Action && node.props.title === "Switch to Tab")[0];
  await action.props.onAction();
  assert.equal(focused[0][1].id, "11");
  assert.equal(focused[0][2].id, "11:0");
});

test("window-title matches open all tabs and compound queries retain only unmatched context", () => {
  const view = renderer(snapshot);
  let hit = search(view, "work")[0];
  assert.equal(hit.props.title, "Work");
  let target = push(view, hit, "Show Tabs").props.target;
  assert.equal(target.props.initialSearchText, "");
  let child = tabsView(target);
  assert.deepEqual(
    rows(child, child.render()).map((row) => row.props.title),
    ["GitHub project", "Reference"],
  );
  hit = search(view, "safari work github")[0];
  target = push(view, hit, "Show Tabs").props.target;
  assert.equal(target.props.initialSearchText, "github");
  child = tabsView(target);
  assert.deepEqual(
    rows(child, child.render()).map((row) => row.props.title),
    ["GitHub project"],
  );
  const browserTarget = push(view, hit, "Show Browser Tabs and Windows").props.target;
  assert.equal(browserTarget.props.initialSearchText, "work github");
});

test("app-only search clears at the next level and parent query and selection survive navigation", () => {
  const view = renderer(snapshot);
  const hit = search(view, "Safari")[0];
  view.render().props.onSelectionChange(hit.props.id);
  const target = push(view, hit, "Show Browser Tabs and Windows").props.target;
  assert.equal(target.props.initialSearchText, "");
  const child = renderer(
    { browserWindows: windows },
    {},
    "src/browser-windows.tsx",
    "BrowserWindowsView",
    target.props,
  );
  assert.equal(rows(child, child.render()).length, 2);
  search(child, "github");
  const parent = view.render();
  assert.equal(parent.props.searchText, "Safari");
  assert.equal(parent.props.selectedItemId, hit.props.id);
  parent.props.onSearchTextChange("code");
  assert.equal(view.render().props.selectedItemId, undefined);
});

test("browser window search carries window-only matches into an unfiltered tab list", () => {
  const view = renderer({ browserWindows: windows }, {}, "src/browser-windows.tsx", "BrowserWindowsView", {
    browser: safari,
  });
  const hit = search(view, "work")[0];
  assert.equal(hit.props.title, "Work");
  const child = tabsView(push(view, hit, "Show Tabs").props.target);
  assert.equal(child.render().props.searchText, "");
  assert.equal(rows(child, child.render()).length, 2);
  assert.deepEqual(
    search(view, "work github").map((row) => row.props.subtitle.value),
    ["github.com/one"],
  );
  const single = renderer({ browserWindows: [windows[0]] }, {}, "src/browser-windows.tsx", "BrowserWindowsView", {
    browser: safari,
    initialSearchText: "safari work",
  });
  assert.equal(rows(single, single.render()).length, 2);
});

test("native and AX window drill-downs share multi-term filtering and consume the app context", () => {
  const app = {
    id: "editor",
    name: "Editor",
    pids: [3],
    windows: [native(30, 3, "Editor", "Project notes"), native(31, 3, "Editor", "Other")],
  };
  const ax = [
    { pid: 3, index: 1, title: "Project notes" },
    { pid: 3, index: 2, title: "Other" },
  ];
  for (const [exportName, windowList] of [
    ["AppWindowsView", app.windows],
    ["AXWindowsView", ax],
  ] as const) {
    const view = renderer({}, {}, "src/app-windows.tsx", exportName, {
      app,
      windows: windowList,
      initialSearchText: "editor notes project",
      onFocus() {},
      onRefresh() {},
    });
    assert.equal(view.render().props.searchText, "notes project");
    assert.deepEqual(
      rows(view, view.render()).map((row) => row.props.title),
      ["Project notes"],
    );
  }
  const root = renderer({
    ...snapshot,
    windows: [native(30, 3, "Editor", "Fallback")].map((w) => ({ ...w, "has-ax-reference": false })),
    axWindowsByPid: { 3: ax },
  });
  const hit = search(root, "editor project notes")[0];
  assert.equal(hit.props.title, "Project notes");
  const target = push(root, hit, "Show Windows").props.target;
  assert.equal(target.props.initialSearchText, "project notes");
});

test("search normalizes case and width, preserves remaining terms and does not require term order", () => {
  const { matchesSearch, remainingSearch } = createLoader({})("src/helpers/search.ts");
  assert.equal(matchesSearch("GitHub Project", "ＰＲＯＪＥＣＴ github"), true);
  assert.equal(matchesSearch("Project", "project missing"), false);
  assert.equal(remainingSearch("  SAFARI  Work GitHub  ", ["Safari", "Work"]), "GitHub");
});

test("Firefox name search uses reconciled bridge IDs and keeps unmatched native windows", () => {
  const view = renderer({
    ...snapshot,
    windows: [native(100, 4, "Firefox", "Runtime / this-firefox"), native(101, 4, "Firefox", "Mozilla Firefox")],
    browserCounts: { firefox: { windows: 2 } },
    browserTabs: {
      firefox: [
        {
          id: "session:1",
          nativeWindowId: "100",
          title: "Runtime / this-firefox",
          tabs: [
            { id: "session:tab:1", title: "Firefox add-ons", url: "https://addons.mozilla.org" },
            { id: "session:tab:2", title: "Runtime / this-firefox", url: "about:debugging#/runtime/this-firefox" },
          ],
        },
      ],
    },
  });
  for (const query of ["fire", "Firefox", "ＦＩＲＥ"]) {
    const hits = search(view, query);
    assert.deepEqual(
      hits.map((row) => row.props.title),
      ["Firefox", "Firefox add-ons", "Runtime / this-firefox", "Mozilla Firefox"],
    );
    assert.equal(hits[0].props.subtitle, "2 windows");
    assert(push(view, hits[0], "Show Browser Tabs and Windows"));
  }
  for (const query of ["firefox runtime", "runtime"]) {
    const hits = search(view, query);
    assert.deepEqual(
      hits.map((row) => row.props.title),
      ["Runtime / this-firefox"],
    );
    assert.equal(hits[0].props.subtitle.value, "about:debugging#/runtime/this-firefox");
  }
});

test("matching apps, native windows and AX windows remain available together", () => {
  const view = renderer({
    ...snapshot,
    windows: [
      native(30, 3, "Notes", "Notes about Safari"),
      { ...native(40, 4, "Notes Helper", "Fallback"), "has-ax-reference": false },
    ],
    axWindowsByPid: { 4: [{ pid: 4, index: 1, title: "Notes document" }] },
    applicationOrder: [4, 3],
  });
  assert.deepEqual(
    search(view, "notes").map((row) => row.props.title),
    ["Notes", "Notes Helper", "Notes about Safari", "Notes document"],
  );
  assert.deepEqual(
    search(view, "document").map((row) => row.props.title),
    ["Notes document"],
  );
});

test("tab hits only replace their own native window, retaining other unreadable and duplicate-title windows", () => {
  const { searchApplications } = createLoader({})("src/search-results.ts");
  for (const otherTitle of ["Project notes", "Project GitHub"]) {
    for (const companion of [false, true]) {
      const nativeWindows = [native(10, 1, "Firefox", "Project GitHub"), native(11, 1, "Firefox", otherTitle)];
      const browserWindows = [
        {
          id: companion ? "session:1" : "10",
          ...(companion ? { nativeWindowId: "10" } : {}),
          title: "Project GitHub",
          tabs: [{ id: "tab:1", title: "Project GitHub", url: "https://github.com" }],
        },
        { id: "11", title: otherTitle, tabs: [], tabListUnavailable: true },
      ];
      const hits = searchApplications(
        [{ id: "firefox", name: "Firefox", pids: [1], windows: nativeWindows }],
        "project",
        { firefox: browserWindows },
        {},
      );
      assert.deepEqual(
        hits.map((hit: MockValue) => [hit.kind, hit.window.id]),
        [
          ["tab", companion ? "session:1" : "10"],
          ["window", 11],
        ],
      );
    }
  }
});

test("unmapped companion windows do not hide native windows by title or position", () => {
  const { searchApplications } = createLoader({})("src/search-results.ts");
  const hits = searchApplications(
    [{ id: "firefox", name: "Firefox", pids: [1], windows: [native(10, 1, "Firefox", "Project")] }],
    "project",
    { firefox: [{ id: "session:1", title: "Project", tabs: [{ id: "tab:1", title: "Project", url: "" }] }] },
    {},
  );
  assert.deepEqual(
    hits.map((hit: MockValue) => hit.kind),
    ["tab", "window"],
  );
});

test("a reconciled companion window keeps Show Tabs navigation when only the native title matches", () => {
  const view = renderer({
    ...snapshot,
    windows: [native(10, 1, "Firefox", "Research")],
    browserTabs: {
      firefox: [
        {
          id: "session:1",
          nativeWindowId: "10",
          title: "Current page",
          tabs: [{ id: "tab:1", title: "Other", url: "" }],
        },
      ],
    },
  });
  const [hit] = search(view, "research");
  assert.equal(push(view, hit, "Show Tabs")?.props.target.props.window.id, "session:1");
});

test("mixed native and AX windows load and search without losing fallback targets or duplicating direct targets", async () => {
  const nativeWindows = [
    native(20, 3, "Editor", "First"),
    { ...native(21, 3, "Editor", "Second"), "has-ax-reference": false },
  ];
  const axWindows = [
    { pid: 3, index: 1, title: "First", subrole: "AXStandardWindow" },
    { pid: 3, index: 2, title: "Second", subrole: "AXStandardWindow" },
  ];
  const { loadWindowData } = createLoader({})("src/window-data.ts");
  const snapshots: MockValue[] = [];
  const queried: number[] = [];
  await loadWindowData((data: MockValue) => snapshots.push(data), {
    queryWindows: async () => nativeWindows,
    getRunningApplicationMetadata: async () => ({}),
    queryAXWindows: async (pid: number) => {
      queried.push(pid);
      return axWindows;
    },
    getBrowserSummary: async () => {
      throw new Error("Not a browser");
    },
  });
  assert.deepEqual(queried, [3]);
  const focused: MockValue[] = [];
  const view = renderer(snapshots.at(-1), {
    "./windows": { raiseAXWindow: async (window: MockValue) => focused.push(window) },
  });
  assert.deepEqual(
    search(view, "first").map((row) => row.props.id),
    ["window:3:20"],
  );
  const [hit] = search(view, "editor second");
  assert.equal(hit.props.id, 'ax:3:[2,"Second","AXStandardWindow"]');
  await findAll(hit, (node) => node.type === view.ui.Action && node.props.title === "Focus Window")[0].props.onAction();
  assert.deepEqual(focused, [axWindows[1]]);
});

test("AX fallback deduplication respects process and window subrole", () => {
  const { searchApplications } = createLoader({})("src/search-results.ts");
  const direct = { ...native(20, 3, "Editor", "Project"), subrole: "AXStandardWindow" };
  const hits = searchApplications(
    [
      {
        id: "editor",
        name: "Editor",
        pids: [3, 4],
        windows: [direct, { ...native(21, 3, "Editor", "Other"), "has-ax-reference": false }],
      },
    ],
    "project",
    {},
    {
      3: [
        { pid: 3, index: 1, title: "Project", subrole: "AXStandardWindow" },
        { pid: 3, index: 2, title: "Project", subrole: "AXDialog" },
      ],
      4: [{ pid: 4, index: 1, title: "Project", subrole: "AXStandardWindow" }],
    },
  );
  assert.deepEqual(
    hits.map((hit: MockValue) => hit.id),
    ["window:3:20", 'ax:3:[2,"Project","AXDialog"]', 'ax:4:[1,"Project","AXStandardWindow"]'],
  );
});

test("typing holds existing result positions while new browser matches arrive and preserves exact targets", async () => {
  const original = { id: "10:ax:one", title: "Reference", url: "https://github.com/one" };
  const fresh = { id: "10:ax:two", title: "GitHub docs", url: "https://example.com" };
  const data = {
    ...snapshot,
    windows: [native(10, 1, "Safari", "Work")],
    browserTabs: { safari: [{ id: "10", title: "Work", tabs: [original] }] },
  };
  const focused: MockValue[][] = [];
  const view = renderer(data, { "./browsers/client": { focusBrowserTab: async (...args) => focused.push(args) } });
  const [first] = search(view, "github");
  view.render().props.onSelectionChange(first.props.id);
  data.browserTabs.safari[0].tabs = [original, fresh];
  const updated = view.render();
  assert.deepEqual(
    rows(view, updated).map((row) => row.props.title),
    ["Reference", "GitHub docs"],
  );
  assert.equal(updated.props.selectedItemId, first.props.id);
  const later = { id: "10:ax:three", title: "GitHub", url: "https://example.org" };
  data.browserTabs.safari[0].tabs = [later, fresh, original];
  assert.deepEqual(
    rows(view, view.render()).map((row) => row.props.title),
    ["Reference", "GitHub docs", "GitHub"],
    "newly appended results also keep their positions through subsequent updates",
  );
  await findAll(rows(view, updated)[0], (node) => node.props.title === "Switch to Tab")[0].props.onAction();
  assert.equal(focused[0][2].id, original.id);
  data.browserTabs.safari[0].tabs = [fresh];
  const missing = view.render();
  assert.equal(rows(view, missing)[0].props.id, first.props.id);
  assert.equal(rows(view, missing)[0].props.subtitle, "No longer available");
  assert.equal(findAll(rows(view, missing)[0], (node) => node.props.title === "Switch to Tab").length, 0);
  assert.deepEqual(
    search(view, "github docs").map((row) => row.props.title),
    ["GitHub docs"],
  );
});

test("tab enrichment keeps a held native window focusable and updates its live metadata", async () => {
  const data = {
    ...snapshot,
    windows: [native(10, 1, "Safari", "Project")],
    browserTabs: {} as Record<string, MockValue[]>,
  };
  const focused: MockValue[] = [];
  const view = renderer(data, {
    "./window-focus": {
      focusNativeWindow: async (window) => {
        focused.push(window);
        return "focused";
      },
    },
  });
  const [first] = search(view, "project");
  view.render().props.onSelectionChange(first.props.id);
  const latest = { ...data.windows[0], title: "Project updated", space: 3 };
  data.windows = [latest];
  data.browserTabs.safari = [
    {
      id: "session:1",
      nativeWindowId: "10",
      title: "Project updated",
      tabs: [{ id: "session:11", title: "Project docs", url: "https://example.com" }],
    },
  ];
  const updated = view.render();
  const hits = rows(view, updated);
  assert.deepEqual(
    hits.map((row) => row.props.title),
    ["Project updated", "Project docs"],
  );
  assert.equal(hits[0].props.id, first.props.id);
  assert.equal(updated.props.selectedItemId, first.props.id);
  assert(push(view, hits[0], "Show Tabs"), "the held window should receive its loaded tabs");
  await findAll(hits[0], (node) => node.props.title === "Focus Window")[0].props.onAction();
  assert.deepEqual(focused, [latest]);
  data.windows = [];
  data.browserTabs = {};
  const missing = rows(view, view.render())[0];
  assert.equal(missing.props.subtitle, "No longer available");
  assert.equal(findAll(missing, (node) => node.props.title === "Focus Window").length, 0);
});

test("held tabs keep their action when their title stops matching but the tab still exists", async () => {
  const original = { id: "10:ax:one", title: "Project docs", url: "https://example.com" };
  const data = {
    ...snapshot,
    windows: [native(10, 1, "Safari", "Work")],
    browserTabs: { safari: [{ id: "10", title: "Work", tabs: [original] }] },
  };
  const focused: MockValue[][] = [];
  const view = renderer(data, { "./browsers/client": { focusBrowserTab: async (...args) => focused.push(args) } });
  const [first] = search(view, "project");
  view.render().props.onSelectionChange(first.props.id);
  const latest = { ...original, title: "Reference" };
  data.browserTabs.safari[0].tabs = [latest];
  const [held] = rows(view, view.render());
  assert.equal(held.props.id, first.props.id);
  assert.equal(held.props.title, "Reference");
  await findAll(held, (node) => node.props.title === "Switch to Tab")[0].props.onAction();
  assert.equal(focused[0][2], latest);
});

test("a reused AX index cannot silently retarget the selected search result", () => {
  const old = { pid: 3, index: 1, title: "Project old", subrole: "AXStandardWindow" };
  const data = {
    ...snapshot,
    windows: [{ ...native(20, 3, "Editor", "Fallback"), "has-ax-reference": false }],
    browserTabs: {},
    axWindowsByPid: { 3: [old] },
  };
  const view = renderer(data);
  const [first] = search(view, "project");
  view.render().props.onSelectionChange(first.props.id);
  data.axWindowsByPid[3] = [{ ...old, title: "Project new" }];
  const updated = view.render();
  const targets = rows(view, updated);
  assert.deepEqual(
    targets.map((row) => row.props.title),
    ["Project old", "Project new"],
  );
  assert.equal(targets[0].props.subtitle, "No longer available");
  assert.equal(findAll(targets[0], (node) => node.props.title === "Focus Window").length, 0);
  assert.notEqual(targets[0].props.id, targets[1].props.id);
  assert.equal(updated.props.selectedItemId, first.props.id);
});
