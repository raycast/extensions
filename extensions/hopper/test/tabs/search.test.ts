import { test } from "node:test";
import assert from "node:assert/strict";
import type { Tab, TabKind } from "../../src/lib/tabs/model.ts";
import { searchTabs } from "../../src/lib/tabs/search.ts";
import { app } from "../fake-platform.ts";

const chrome = app("com.google.Chrome", "Google Chrome");
const cmux = app("com.cmuxterm.app", "cmux");
const claude = app("com.anthropic.claudefordesktop", "Claude");

let n = 0;
const tab = (a: Tab["app"], title: string, extra: Partial<Tab> = {}): Tab => ({
  key: String(n++),
  app: a,
  source: "test",
  kind: "tab" as TabKind,
  title,
  active: false,
  ref: null,
  ...extra,
});

const titles = (tabs: Tab[]) => tabs.map((t) => `${t.app.name}: ${t.title}`);

const tabs = [
  tab(chrome, "Claude", { url: "https://claude.ai/new" }),
  tab(cmux, "claude"),
  tab(chrome, "GitHub", { url: "https://github.com" }),
  tab(cmux, "github-pages"),
  tab(claude, "Fix login bug", { kind: "session" }),
  tab(claude, "Refactor tabs", { kind: "session" }),
];

test("blank query keeps every tab in order", () => {
  assert.deepEqual(searchTabs(tabs, "  "), tabs);
});

test("an app's own tabs rank above tabs that mention its name", () => {
  assert.deepEqual(titles(searchTabs(tabs, "claude")).slice(0, 2), ["Claude: Fix login bug", "Claude: Refactor tabs"]);
  assert.ok(titles(searchTabs(tabs, "claude")).includes("Google Chrome: Claude"));
});

test("typos still find the tab, app first", () => {
  for (const query of ["caude", "cluade"]) assert.equal(titles(searchTabs(tabs, query))[0], "Claude: Fix login bug");
  assert.equal(titles(searchTabs(tabs, "githbu"))[0], "Google Chrome: GitHub");
});

test("every query word must match some field", () => {
  assert.deepEqual(titles(searchTabs(tabs, "github pages")), ["cmux: github-pages"]);
  assert.deepEqual(searchTabs(tabs, "claude xyzzy"), []);
});
