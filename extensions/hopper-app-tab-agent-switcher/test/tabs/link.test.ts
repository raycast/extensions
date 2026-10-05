import { test } from "node:test";
import assert from "node:assert/strict";
import { entryLink, reopenable } from "../../src/lib/tabs/history.ts";
import { linkFor } from "../../src/lib/tabs/load.ts";
import type { App, Tab } from "../../src/lib/tabs/model.ts";
import { app } from "../fake-platform.ts";

const tab = (application: App, source: string, ref: unknown, extra: Partial<Tab> = {}): Tab => ({
  key: `${application.bundleId}:${JSON.stringify(ref)}`,
  app: application,
  source,
  kind: "tab",
  title: "T",
  active: false,
  ref,
  ...extra,
});
const chrome = app("com.google.Chrome", "Google Chrome");
const notionApp = app("notion.id", "Notion");
const notionPage = "https://www.notion.so/team/Roadmap-3a7b24976dd3804abe0bf4a0c21ee70c";

test("links: browser tabs copy their web URL; internal pages none", () => {
  assert.equal(linkFor(tab(chrome, "chromium", { tabId: 1 }, { url: "https://a.com/x" })), "https://a.com/x");
  assert.equal(linkFor(tab(chrome, "chromium", { tabId: 2 }, { url: "chrome://settings" })), undefined);
  assert.equal(linkFor(tab(chrome, "chromium", { tabId: 3 }, { url: "file:///Users/me/a.html" })), undefined);
});

test("links: Notion copies the page's notion.so address, not the deep link", () => {
  assert.equal(linkFor(tab(notionApp, "notion", { title: "Roadmap", url: notionPage })), notionPage);
  assert.equal(linkFor(tab(notionApp, "notion", { title: "Roadmap" })), undefined);
});

test("links: places with only a link that works on this Mac have none", () => {
  const claudeApp = app("com.anthropic.claudefordesktop", "Claude");
  const obsidianApp = app("md.obsidian", "Obsidian");
  const textEdit = app("com.apple.TextEdit", "TextEdit");
  assert.equal(linkFor(tab(claudeApp, "claude", { sessionId: "s1" })), undefined);
  assert.equal(linkFor(tab(claudeApp, "claude", { path: "chat/0b1c2d3e-0000-4000-8000-000000000000" })), undefined);
  const note = { vault: "V", vaultId: "abc", file: "a.md", popout: false, occurrence: 0 };
  assert.equal(linkFor(tab(obsidianApp, "obsidian", note)), undefined);
  const doc = { index: 0, title: "A", document: "file:///Users/me/A.txt" };
  assert.equal(linkFor(tab(textEdit, "windows", doc)), undefined);
});

test("links: Recently Closed and bookmarks keep their tab's link", () => {
  const [page] = reopenable([tab(notionApp, "notion", { title: "Roadmap", url: notionPage })]);
  assert.equal(page.link, notionPage);
  assert.equal(entryLink(page), notionPage);
  const [web] = reopenable([tab(chrome, "chromium", { tabId: 1 }, { url: "https://a.com/x" })]);
  assert.equal(web.link, undefined, "the URL is the link: not stored twice");
  assert.equal(entryLink(web), "https://a.com/x");
  // Saved before links were stored: a Notion entry has only its notion:// reopen target.
  assert.equal(entryLink({}), undefined);
});
