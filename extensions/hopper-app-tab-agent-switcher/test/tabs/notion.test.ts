import { test } from "node:test";
import assert from "node:assert/strict";
import { notion, pageId, parseAncestors, shortPath, tabLink } from "../../src/lib/tabs/sources/notion.ts";
import type { AXWindow, SidebarQuery } from "../../src/lib/tabs/model.ts";
import { app, fakePlatform } from "../fake-platform.ts";

const notionApp = app("notion.id", "Notion");
const row = (title: string) => ({ title, text: "", selected: false });
const win = (index: number, title: string): AXWindow => ({ index, title, minimized: false, tabs: [] });

test("Notion: front window's tabs, the selected one named by the window title, then other windows", async () => {
  const platform = fakePlatform({
    sidebarRows: async () => [row("Q/A"), row("Looper"), row("Q/A")],
    windows: async () => [{ bundleId: "notion.id", windows: [win(1, "Looper"), win(2, "Roadmap")] }],
  });
  const tabs = await notion.list(notionApp, platform);
  assert.deepEqual(
    tabs.map((t) => [t.title, t.kind, t.source, t.active]),
    [
      ["Q/A", "tab", "notion", false],
      ["Looper", "tab", "notion", true],
      ["Roadmap", "window", "windows", false],
    ],
  );
});

test("Notion: selecting a tab presses it in the tab bar", async () => {
  let opened: unknown[] = [];
  const platform = fakePlatform({
    sidebarRows: async () => [row("Looper")],
    windows: async () => [{ bundleId: "notion.id", windows: [win(1, "Looper")] }],
    openSidebarRow: async (...args) => {
      opened = args;
      return true;
    },
  });
  const [tab] = await notion.list(notionApp, platform);
  await notion.select(tab, platform);
  assert.equal(opened[0], "notion.id");
  assert.equal((opened[1] as SidebarQuery).container, "Tab Bar");
  assert.equal(opened[2], "Looper");
});

test("Notion: no tab bar found falls back to its windows", async () => {
  const platform = fakePlatform({
    sidebarRows: async () => [],
    windows: async () => [{ bundleId: "notion.id", windows: [win(1, "Looper"), win(2, "Roadmap")] }],
  });
  const tabs = await notion.list(notionApp, platform);
  assert.deepEqual(
    tabs.map((t) => [t.title, t.source, t.active]),
    [
      ["Looper", "windows", true],
      ["Roadmap", "windows", false],
    ],
  );
});

test("Notion: page id from a page URL", () => {
  assert.equal(
    pageId("https://app.notion.com/p/Number-Round-Problem-3a7b24976dd3804abe0bf4a0c21ee70c"),
    "3a7b2497-6dd3-804a-be0b-f4a0c21ee70c",
  );
  assert.equal(
    pageId("https://www.notion.so/3A7B24976DD3804ABE0BF4A0C21EE70C?pvs=4"),
    "3a7b2497-6dd3-804a-be0b-f4a0c21ee70c",
  );
  assert.equal(pageId("https://app.notion.com/chat"), undefined);
  assert.equal(pageId("not a url"), undefined);
});

test("Notion: ancestors keep pages and databases, nearest first, skipping other blocks", () => {
  const rows = [
    { root: "a", depth: 1, tab: "block", type: "bulleted_list", title: "(1) general" },
    { root: "a", depth: 2, tab: "block", type: "page", title: "Jordan Convo 2" },
    { root: "a", depth: 3, tab: "collection", type: null, title: "Interviews" },
    { root: "a", depth: 4, tab: "block", type: "collection_view_page", title: null },
    { root: "a", depth: 5, tab: "block", type: "page", title: "Tech Interviewing" },
    { root: "b", depth: 1, tab: "block", type: "page", title: " " },
  ];
  assert.deepEqual(Object.fromEntries(parseAncestors(rows)), {
    a: ["Jordan Convo 2", "Interviews", "Tech Interviewing"],
  });
});

test("Notion: short path keeps the nearest parents and elides the farthest", () => {
  assert.equal(shortPath([]), "");
  assert.equal(shortPath(["Pinterest", "Tech"]), "Tech / Pinterest");
  assert.equal(shortPath(["Jordan Convo 2", "Pinterest", "Tech Interviewing"]), "… / Pinterest / Jordan Convo 2");
  assert.equal(shortPath(["A very long parent page title", "Root"], 20), "… / A very long parent…");
});

test("Notion: tabs show their page's parents, in full on hover", async () => {
  let query = "";
  const platform = fakePlatform({
    sidebarRows: async () => [row("Number Round Problem"), row("Q/A")],
    windows: async () => [{ bundleId: "notion.id", windows: [win(1, "Q/A")] }],
    webPages: async () => [
      { title: "Q/A", url: "https://app.notion.com/p/Q-A-3dbb24976dd380f0b0feff9b483e686e" },
      {
        title: "Number Round Problem",
        url: "https://app.notion.com/p/Number-Round-Problem-3a7b24976dd3804abe0bf4a0c21ee70c",
      },
    ],
    querySqlite: async (path, sql) => {
      assert.equal(path, "/Users/me/Library/Application Support/Notion/notion.db");
      query = sql;
      return ["Jordan Convo 2", "Pinterest", "Tech Interviewing"].map((title, i) => ({
        root: "3a7b2497-6dd3-804a-be0b-f4a0c21ee70c",
        depth: i + 1,
        tab: "block",
        type: "page",
        title,
      }));
    },
  });
  const tabs = await notion.list(notionApp, platform);
  assert.match(query, /'3a7b2497-6dd3-804a-be0b-f4a0c21ee70c'/);
  assert.deepEqual(
    tabs.map((t) => [t.title, t.detail, t.detailFull]),
    [
      ["Number Round Problem", "… / Pinterest / Jordan Convo 2", "Tech Interviewing / Pinterest / Jordan Convo 2"],
      ["Q/A", undefined, undefined],
    ],
  );
});

test("Notion: an unreadable cache still lists the tabs", async () => {
  const platform = fakePlatform({
    sidebarRows: async () => [row("Looper")],
    windows: async () => [{ bundleId: "notion.id", windows: [win(1, "Looper")] }],
    webPages: async () => [
      { title: "Looper", url: "https://app.notion.com/p/Looper-3c1b24976dd380a89df7fdac87f63569" },
    ],
    querySqlite: async () => {
      throw new Error("no such table: block");
    },
  });
  const tabs = await notion.list(notionApp, platform);
  assert.deepEqual(
    tabs.map((t) => [t.title, t.detail]),
    [["Looper", undefined]],
  );
});

test("Notion: a tab with a known page opens by deep link (switches to it, or reopens it in a new tab)", async () => {
  const urls: string[] = [];
  const platform = fakePlatform({
    sidebarRows: async () => [row("Q/A"), row("Looper")],
    windows: async () => [{ bundleId: "notion.id", windows: [win(1, "Looper")] }],
    webPages: async () => [
      { title: "Q/A", url: "https://app.notion.com/p/Q-A-3dbb24976dd380f0b0feff9b483e686e?pvs=4" },
    ],
    querySqlite: async () => [],
    openUrl: async (url) => {
      urls.push(url);
    },
    openSidebarRow: async () => true,
  });
  const [qa, looper] = await notion.list(notionApp, platform);
  const link = "notion://app.notion.com/p/Q-A-3dbb24976dd380f0b0feff9b483e686e?pvs=4&deepLinkOpenNewTab=true";
  assert.equal(qa.url, undefined, "detail stays the parents, not the host");
  await notion.select(qa, platform);
  assert.deepEqual(urls, [link]);
  assert.deepEqual(notion.reopenTarget?.(qa), { kind: "url", target: link });
  assert.equal(notion.reopenTarget?.(looper), undefined, "no page URL: not reopenable");
});

test("Notion: same-titled tabs of different pages are separate entries, each opening its own page", async () => {
  const urls: string[] = [];
  const page = (id: string) => `https://app.notion.com/p/Roadmap-${id}`;
  const a = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const b = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const c = "cccccccccccccccccccccccccccccccc";
  const platform = fakePlatform({
    // Two "Roadmap" tabs in the front window; the same Q/A page open twice.
    sidebarRows: async () => [row("Roadmap"), row("Q/A"), row("Roadmap"), row("Q/A")],
    windows: async () => [{ bundleId: "notion.id", windows: [win(1, "Q/A"), win(2, "Other")] }],
    // Front window's web views first, then a third "Roadmap" open in the other window.
    webPages: async () => [
      { title: "Roadmap", url: page(a) },
      { title: "Q/A", url: "https://app.notion.com/p/Q-A-3dbb24976dd380f0b0feff9b483e686e" },
      { title: "Roadmap", url: page(b) },
      { title: "Q/A", url: "https://app.notion.com/p/Q-A-3dbb24976dd380f0b0feff9b483e686e" },
      { title: "Roadmap", url: page(c) },
    ],
    querySqlite: async () =>
      [a, b].map((id, i) => ({
        root: `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`,
        depth: 1,
        tab: "block",
        type: "page",
        title: i === 0 ? "Product" : "Marketing",
      })),
    openUrl: async (url) => {
      urls.push(url);
    },
  });
  const tabs = (await notion.list(notionApp, platform)).filter((t) => t.source === "notion");
  assert.deepEqual(
    tabs.map((t) => [t.title, t.detail]),
    [
      ["Roadmap", "Product"],
      ["Roadmap", "Marketing"],
      ["Q/A", undefined],
    ],
  );
  assert.equal(new Set(tabs.map((t) => t.key)).size, 3);
  await notion.select(tabs[1], platform);
  assert.deepEqual(urls, [`notion://app.notion.com/p/Roadmap-${b}?deepLinkOpenNewTab=true`]);
});

test("tabLink: https Notion URLs only", () => {
  assert.equal(
    tabLink("https://app.notion.com/p/Looper-3c1b24976dd380a89df7fdac87f63569"),
    "notion://app.notion.com/p/Looper-3c1b24976dd380a89df7fdac87f63569?deepLinkOpenNewTab=true",
  );
  assert.equal(tabLink("file:///x"), undefined);
  assert.equal(tabLink("not a url"), undefined);
});
