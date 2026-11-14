import assert from "node:assert/strict";
import test from "node:test";
import type { BrowserWindow } from "../src/browsers/types";
import type { Window } from "../src/windows";
import type { WindowSearchData } from "../src/window-data";
import createLoader from "./load-ts.ts";
import { renderer, findAll } from "./render-ui.ts";

const native = (id: number, app = "Opera"): Window => ({
  id,
  pid: app === "Opera" ? 20 : 30,
  app,
  title: `Window ${id}`,
  bundlePath: `/Users/example/Applications/${app}.app`,
  space: id === 10 ? 1 : 2,
  frame: { x: 0, y: 0, w: 800, h: 600 },
  "has-ax-reference": true,
});
const operaNative = [native(10), native(11)];
const operaWindows: BrowserWindow[] = operaNative.map((window, index) => ({
  id: String(window.id),
  title: window.title,
  space: window.space,
  tabs: [
    {
      id: `${window.id}:ax:aaaaaaaa-bbbb-cccc-dddd-${index === 0 ? "eeeeeeeeeeee" : "ffffffffffff"}`,
      title: "Same page title",
      url: `https://opera.example/background-${index}`,
    },
  ],
}));

test("Opera enrichment searches background URLs and focuses the exact tab without including another browser", async () => {
  const windows = [...operaNative, native(30, "Google Chrome"), native(40, "Opera GX")];
  const calls: { name: string; args: string[] }[] = [];
  const load = createLoader({
    "../windows": { queryWindows: async () => windows },
    "../helpers/browser-helper": {
      runBrowserHelper: async (name, _directory, args) => {
        calls.push({ name, args });
        if (args[0] === "focus") return "ok";
        return JSON.stringify(args[1] === "Opera" ? operaWindows : []);
      },
    },
  });
  const client = load("src/browsers/client.ts");
  const { loadWindowData } = load("src/window-data.ts");
  let snapshot!: WindowSearchData;
  await loadWindowData(
    (data: WindowSearchData) => {
      snapshot = data;
    },
    {
      queryWindows: async () => windows,
      getRunningApplicationMetadata: async () => ({}),
      queryAXWindows: async () => [],
      getBrowserWindows: client.getBrowserWindows,
      getBrowserSummary: client.getBrowserSummary,
    },
  );
  assert.equal(snapshot.browserTabs.opera?.length, 2);
  const list = calls.find((call) => call.args[0] === "list" && call.args[1] === "Opera");
  assert(list, "the normal loading pipeline must discover Opera as a browser");
  assert.equal(list.name, "chromium-ax");
  assert.deepEqual(
    JSON.parse(list.args[2]).map((window: Window) => window.id),
    [10, 11],
  );

  const { groupApplications } = load("src/app-groups.ts");
  const { searchApplications } = load("src/search-results.ts");
  const apps = groupApplications(snapshot.windows, snapshot.metadataByPid);
  const results = searchApplications(apps, "opera.example/background-1", snapshot.browserTabs, snapshot.axWindowsByPid);
  assert.equal(results.length, 1);
  assert.equal(results[0].kind, "tab");
  await client.focusBrowserTab(results[0].browser, results[0].window, results[0].tab);
  assert.deepEqual(calls.at(-1), {
    name: "chromium-ax",
    args: ["focus", "Opera", "11", operaWindows[1].tabs[0].id, "Same page title", "20"],
  });
});

test("Opera app rows open browser navigation and root URL search retains the exact window, tab and bundle path", async () => {
  const focused: unknown[][] = [];
  const view = renderer(
    {
      windows: operaNative,
      metadataByPid: {},
      browserCounts: { opera: { windows: 2 } },
      browserTabs: { opera: operaWindows },
      axWindowsByPid: {},
    },
    {
      "./browsers/client": {
        focusBrowserTab: async (...args) => {
          focused.push(args);
        },
      },
    },
  );
  const root = view.render();
  const app = findAll(root, (node) => node.type === view.ui.List.Item && node.props.title === "Opera")[0];
  assert.equal(app.props.subtitle, "2 windows");
  const navigation = findAll(app, (node) => node.props.title === "Show Browser Tabs and Windows")[0];
  assert(navigation, "Opera must open the browser view instead of a generic window list");
  assert.equal(navigation.props.target.props.browser.appPath, operaNative[0].bundlePath);
  assert.deepEqual(navigation.props.target.props.initialSnapshot.nativeWindows, operaNative);

  root.props.onSearchTextChange("opera.example/background-1");
  const hits = findAll(view.render(), (node) => node.type === view.ui.List.Item);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].props.icon.value.fileIcon, operaNative[0].bundlePath);
  await findAll(hits[0], (node) => node.props.title === "Switch to Tab")[0].props.onAction();
  assert.equal(focused.length, 1);
  assert.equal((focused[0][0] as { id: string }).id, "opera");
  assert.equal(focused[0][1], operaWindows[1]);
  assert.equal(focused[0][2], operaWindows[1].tabs[0]);
});
