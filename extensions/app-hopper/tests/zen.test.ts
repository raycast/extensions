import assert from "node:assert/strict";
import test from "node:test";
import type { WindowSearchData } from "../src/window-data";
import type { BrowserConfig, BrowserWindow } from "../src/browsers/types";
import createLoader from "./load-ts.ts";
import { renderer, findAll } from "./render-ui.ts";

const native = (id: number, app = "Zen") => ({
  id,
  pid: id + 100,
  app,
  title: "Work",
  bundlePath: `/Applications/${app}.app`,
  space: 2,
  frame: { x: 0, y: 0, w: 800, h: 600 },
  "has-ax-reference": true,
});

test("Zen uses Gecko AX with native app scope and a separate companion directory", async () => {
  const calls: string[][] = [];
  const load = createLoader({
    "node:fs/promises": {
      readdir: async (directory: string) => {
        assert(directory.endsWith("raycast-app-hopper-zen"));
        return [];
      },
    },
    "../windows": { queryWindows: async () => [native(10), native(20, "Firefox")] },
    "../helpers/browser-helper": {
      runBrowserHelper: async (_name, _directory, args: string[]) => {
        calls.push(args);
        if (args[0] === "focus") return "ok";
        assert.equal(args[1], "Zen");
        assert.deepEqual(
          JSON.parse(args[2]).map((window: { id: number }) => window.id),
          [10],
        );
        return JSON.stringify([
          {
            id: "10",
            title: "Work",
            tabs: [
              { id: "10:ax:11111111-1111-1111-1111-111111111111", title: "First", url: "https://example.com" },
              { id: "10:ax:22222222-2222-2222-2222-222222222222", title: "Second", url: "" },
            ],
          },
        ]);
      },
    },
  });
  const registry = load("src/browsers/registry.ts");
  const zen: BrowserConfig = registry.getBrowserByAppName("Zen", "/Applications/Zen.app");
  assert.equal(zen.id, "zen");
  assert.equal(zen.engine, "firefox");
  assert.equal(registry.getBrowserById("zen").appName, "Zen");
  const client = load("src/browsers/client.ts");
  const [window]: BrowserWindow[] = await client.getBrowserWindows(zen, [native(10), native(20, "Firefox")]);
  assert.equal(window.space, 2);
  assert.equal(window.tabs[0].url, "https://example.com");
  assert.equal(window.tabs[1].url, "");
  assert.deepEqual(await client.getBrowserSummary(zen, [native(10)]), { windows: 1, tabs: 2 });
  const before = calls.length;
  assert.deepEqual(await client.getBrowserSummary(zen, [native(10), native(11)]), { windows: 2, tabs: undefined });
  assert.equal(calls.length, before);
  await client.focusBrowserTab(zen, window, window.tabs[1]);
  assert.deepEqual(calls.at(-1), ["focus", "Zen", "10", "10:ax:22222222-2222-2222-2222-222222222222", "Second", "110"]);
  await assert.rejects(
    load("src/browsers/firefox.ts").focusFirefoxTab("abcdef1234567890:1", "abcdef1234567890:2", zen),
    /ENOENT/,
  );
});

test("Zen app rows expose browser navigation and searchable cached tabs", () => {
  const window = {
    id: "10",
    title: "Work",
    tabs: [{ id: "10:ax:11111111-1111-1111-1111-111111111111", title: "Zen search target", url: "" }],
  };
  const view = renderer({
    windows: [native(10)],
    metadataByPid: {},
    applicationOrder: [110],
    browserCounts: { zen: { windows: 1, tabs: 1 } },
    browserTabs: { zen: [window] },
    axWindowsByPid: {},
  });
  const action = findAll(view.render(), (node) => node.props.title === "Show Browser Tabs and Windows")[0];
  assert.equal(action.props.target.props.browser.id, "zen");
  assert.equal(action.props.target.props.browser.appPath, "/Applications/Zen.app");
  view.render().props.onSearchTextChange("Zen search target");
  assert.equal(findAll(view.render(), (node) => node.type === view.ui.List.Item).length, 1);
});

test("hidden Zen tabs stay unknown through adapter, root counts and drill-down guidance", async () => {
  const hidden = { id: "10", title: "Current page", tabs: [], tabListUnavailable: true };
  const zen = { id: "zen", appName: "Zen", engine: "firefox" };
  const load = createLoader({
    "node:fs/promises": { readdir: async () => [] },
    "../helpers/browser-helper": { runBrowserHelper: async () => JSON.stringify([hidden]) },
  });
  const firefox = load("src/browsers/firefox.ts");
  const [window] = await firefox.getFirefoxWindows(zen, [native(10)]);
  assert.equal(window.tabListUnavailable, true);
  assert.deepEqual(await firefox.getFirefoxSummary(zen, [native(10)]), { windows: 1, tabs: undefined });
  let counts;
  await load("src/window-data.ts").loadWindowData(
    (data: WindowSearchData) => {
      counts = data.browserCounts.zen;
    },
    {
      queryWindows: async () => [native(10)],
      getRunningApplicationMetadata: async () => ({}),
      queryAXWindows: async () => [],
      getBrowserSummary: async () => {
        throw new Error("unexpected summary path");
      },
      getBrowserWindows: async () => [window],
    },
  );
  assert.deepEqual(counts, { windows: 1, tabs: undefined });

  for (const exportName of ["BrowserWindowsView", "BrowserTabsView"]) {
    const view = renderer({ browserWindows: [window] }, {}, "src/browser-windows.tsx", exportName, {
      browser: zen,
      window,
    });
    const tree = view.render();
    assert.equal(findAll(tree, (node) => node.type === view.ui.List.Item).length, 0);
    const empty = findAll(tree, (node) => node.type === view.ui.List.EmptyView)[0];
    assert.equal(empty.props.title, "Tab List Unavailable");
    assert.match(empty.props.description, /Set up Zen Integration/);
    assert(findAll(tree, (node) => node.props.browserId === "zen").length > 0);
  }
});
