import { test } from "node:test";
import assert from "node:assert/strict";
import { headerQuery, obsidian, parseVaults, vaultName } from "../../src/lib/tabs/sources/obsidian.ts";
import type { WebElementQuery } from "../../src/lib/tabs/model.ts";
import { app, fakePlatform } from "../fake-platform.ts";

const obsidianApp = app("md.obsidian", "Obsidian");

const leaf = (id: string, file: string | undefined, title: string, type = "markdown") => ({
  id,
  type: "leaf",
  state: { type, state: file ? { file } : {}, title },
});

const workspace = JSON.stringify({
  main: {
    type: "split",
    children: [
      {
        type: "tabs",
        children: [
          leaf("a", "Welcome.md", "Welcome"),
          leaf("b", "Projects/Hopper/Roadmap.md", "Roadmap"),
          leaf("e", undefined, "New tab", "empty"),
          leaf("c", "Archive/Welcome.md", "Welcome"),
        ],
      },
      { type: "tabs", children: [leaf("g", undefined, "Graph view", "graph")] },
    ],
  },
  left: { type: "split", children: [{ type: "tabs", children: [leaf("f", undefined, "Files", "file-explorer")] }] },
  floating: {
    type: "floating",
    children: [{ type: "window", children: [{ type: "tabs", children: [leaf("p", "Ideas.md", "Welcome")] }] }],
  },
  active: "b",
});

const appList = JSON.stringify({
  vaults: {
    old: { path: "/Users/me/Notes", ts: 1, open: true },
    work: { path: "/Users/me/Obsidian/Work", ts: 2, open: true },
    closed: { path: "/Users/me/Closed", ts: 3 },
  },
});

function platformWith(overrides = {}) {
  return fakePlatform({
    readFiles: async (dir) => {
      if (dir === "/Users/me/Library/Application Support/obsidian") return [{ path: "", text: appList }];
      if (dir === "/Users/me/Obsidian/Work/.obsidian") return [{ path: "", text: workspace }];
      return [];
    },
    listDir: async (dir: string) => (dir === "/Users/me/Obsidian/Work" ? [".obsidian", "Projects", "Welcome.md"] : []),
    ...overrides,
  });
}

test("Obsidian: open vaults, most recently opened first", () => {
  assert.deepEqual(
    parseVaults(appList).map((v) => v.id),
    ["work", "old"],
  );
  assert.deepEqual(parseVaults("not json"), []);
  assert.equal(vaultName("/Users/me/Obsidian/Work/"), "Work");
});

test("Obsidian: every tab of the vault's windows, with its folder, skipping sidebars and empty tabs", async () => {
  const tabs = await obsidian.list(obsidianApp, platformWith());
  assert.deepEqual(
    tabs.map((t) => [t.title, t.detail, t.active, t.ref.popout, t.ref.occurrence]),
    [
      ["Welcome", "Work", false, false, 0],
      ["Roadmap", "Work / Projects / Hopper", true, false, 0],
      ["Welcome", "Work / Archive", false, false, 1],
      ["Graph view", "Work", false, false, 0],
      ["Welcome", "Work", false, true, 0],
    ],
  );
});

test("Obsidian: a renamed config folder, the newest layout when there are several", async () => {
  const other = JSON.stringify({ main: { type: "tabs", children: [leaf("m", "Mobile.md", "Mobile")] } });
  const platform = platformWith({
    readFiles: async (dir: string) => {
      if (dir === "/Users/me/Library/Application Support/obsidian") return [{ path: "", text: appList }];
      if (dir === "/Users/me/Obsidian/Work/.obsidian") return [{ path: "", text: other, modified: 1 }];
      if (dir === "/Users/me/Obsidian/Work/.obsidian-desktop") return [{ path: "", text: workspace, modified: 2 }];
      return [];
    },
    listDir: async (dir: string) => (dir === "/Users/me/Obsidian/Work" ? [".obsidian", ".obsidian-desktop"] : []),
  });
  const tabs = await obsidian.list(obsidianApp, platform);
  assert.deepEqual(tabs.map((t) => t.title), ["Welcome", "Roadmap", "Welcome", "Graph view", "Welcome"]);
});

test("Obsidian: selecting presses the tab's header in the vault's windows", async () => {
  let pressed: unknown[] = [];
  const platform = platformWith({
    pressWebElement: async (...args: unknown[]) => {
      pressed = args;
      return true;
    },
  });
  const tabs = await obsidian.list(obsidianApp, platform);
  await obsidian.select(tabs[2], platform);
  const [bundleId, query, label, occurrence] = pressed as [string, WebElementQuery, string, number];
  assert.equal(bundleId, "md.obsidian");
  assert.deepEqual(query, {
    window: " - Work - Obsidian",
    within: "mod-root",
    outside: "workspace-window",
    className: "workspace-tab-header",
  });
  assert.equal(label, "Welcome");
  assert.equal(occurrence, 1);
  assert.deepEqual(headerQuery(tabs[4].ref), {
    window: " - Work - Obsidian",
    within: "workspace-window",
    className: "workspace-tab-header",
  });
});

test("Obsidian: a tab whose header is gone opens its note in a new tab", async () => {
  let opened = "";
  const platform = platformWith({
    pressWebElement: async () => false,
    openUrl: async (url: string) => {
      opened = url;
    },
  });
  const tabs = await obsidian.list(obsidianApp, platform);
  await obsidian.select(tabs[1], platform);
  assert.equal(opened, "obsidian://open?vault=work&file=Projects%2FHopper%2FRoadmap.md&paneType=tab");
  await assert.rejects(obsidian.select(tabs[3], platform), { name: "TabGoneError" });
  assert.deepEqual(obsidian.reopenTarget?.(tabs[0]), {
    kind: "url",
    target: "obsidian://open?vault=work&file=Welcome.md&paneType=tab",
  });
});

test("Obsidian: without a readable layout, its windows; a missing app list or layout is reported", async () => {
  const platform = fakePlatform({
    windows: async () => [
      { bundleId: "md.obsidian", windows: [{ index: 1, title: "Welcome - Work - Obsidian", minimized: false, tabs: [] }] },
    ],
  });
  const tabs = await obsidian.list(obsidianApp, platform);
  assert.deepEqual(
    tabs.map((t) => [t.title, t.source]),
    [["Welcome - Work - Obsidian", "windows"]],
  );
  assert.deepEqual(
    platform.reports.map((r) => (r.error as Error).message),
    ["Obsidian runs but has no obsidian.json"],
  );
});
