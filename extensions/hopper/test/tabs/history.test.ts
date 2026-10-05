import { test } from "node:test";
import assert from "node:assert/strict";
import { FIELD as F, RECORD as R } from "../../src/lib/tabs/applescript.ts";
import {
  jumpOrOpen,
  nextHistory,
  openTabFor,
  recordHistory,
  reopenClosed,
  reopenable,
  MAX_CLOSED,
  type Reopenable,
} from "../../src/lib/tabs/history.ts";
import { fileReopenTarget, webReopenTarget } from "../../src/lib/tabs/reopen.ts";
import * as chromium from "../../src/lib/tabs/sources/chromium.ts";
import { fromWindows } from "../../src/lib/tabs/sources/windows.ts";
import type { App, Tab } from "../../src/lib/tabs/model.ts";
import { app, fakePlatform } from "../fake-platform.ts";

const chrome = app("com.google.Chrome", "Google Chrome");
const brave = app("com.brave.Browser", "Brave Browser");
const textEdit = app("com.apple.TextEdit", "TextEdit");
const muse = app("com.meta.endo", "Muse");
const page = (url: string, title = url): Tab => ({
  key: `${chrome.bundleId}:${url}`,
  app: chrome,
  source: "chromium",
  kind: "tab",
  title,
  url,
  active: false,
  ref: { tabId: url },
});
const everything = () => true;

test("reopen targets: web pages and files only", () => {
  assert.deepEqual(webReopenTarget("https://a.com/x"), { kind: "url", target: "https://a.com/x" });
  for (const url of [undefined, "", "about:blank", "chrome://settings", "favorites://"]) {
    assert.equal(webReopenTarget(url), undefined);
  }
  assert.deepEqual(fileReopenTarget("file:///Users/me/My%20Notes.txt"), {
    kind: "file",
    target: "/Users/me/My Notes.txt",
  });
  assert.equal(fileReopenTarget("file:///Users/me/"), undefined, "folders (Terminal's working directory)");
  assert.equal(fileReopenTarget("https://github.com"), undefined);
  assert.equal(fileReopenTarget(undefined), undefined);
});

test("reopenable: only sources that can reopen, one entry per target", () => {
  const doc = fromWindows(textEdit, [
    { index: 1, title: "Notes.txt", minimized: false, document: "file:///Users/me/Notes.txt", tabs: [] },
    { index: 2, title: "Untitled", minimized: false, tabs: [] },
  ]);
  const museChat: Tab = { ...page("x"), app: muse, source: "muse", url: undefined, ref: { name: "x" } };
  const entries = reopenable([page("https://a.com"), page("https://a.com"), page("about:blank"), ...doc, museChat]);
  assert.deepEqual(
    entries.map((e) => [e.id, e.reopen.kind]),
    [
      ["com.google.Chrome https://a.com", "url"],
      ["com.apple.TextEdit /Users/me/Notes.txt", "file"],
    ],
  );
});

test("closed = open last time, gone now; reopened entries leave the list", () => {
  const [a, b] = reopenable([page("https://a.com"), page("https://b.com")]);
  let state = nextHistory({ open: [], closed: [] }, [a, b], everything, 1);
  assert.deepEqual(state.closed, []);
  state = nextHistory(state, [a], everything, 2);
  assert.deepEqual(
    state.closed.map((c) => [c.id, c.closedAt]),
    [[b.id, 2]],
  );
  state = nextHistory(state, [a, b], everything, 3);
  assert.deepEqual(state.closed, [], "open again");
});

test("a page open again with or without a trailing slash isn't closed", () => {
  const [a] = reopenable([page("https://a.com/x")]);
  const [aSlash] = reopenable([page("https://a.com/x/")]);
  let state = nextHistory({ open: [], closed: [] }, [a], everything, 1);
  state = nextHistory(state, [aSlash], everything, 2);
  assert.deepEqual(state.closed, [], "still open");
  state = nextHistory(nextHistory(state, [], everything, 3), [a], everything, 4);
  assert.deepEqual(state.closed, [], "closed, then open again");
});

test("apps outside the read (failed, other scope, no Accessibility) don't close anything", () => {
  const [a] = reopenable([page("https://a.com")]);
  const state = nextHistory(nextHistory({ open: [], closed: [] }, [a], everything, 1), [], () => false, 2);
  assert.deepEqual(state.closed, []);
  assert.deepEqual(
    state.open.map((o) => o.id),
    [a.id],
    "still remembered as open",
  );
});

test("an app that quit closes its tabs (full read covers apps not running)", () => {
  const [a] = reopenable([page("https://a.com")]);
  const state = nextHistory(nextHistory({ open: [], closed: [] }, [a], everything, 1), [], everything, 2);
  assert.deepEqual(
    state.closed.map((c) => c.id),
    [a.id],
  );
});

test("newest first, capped, and entries older than a week dropped", () => {
  const pages = Array.from({ length: MAX_CLOSED + 5 }, (_, i) => page(`https://p${i}.com`));
  const open = reopenable(pages);
  let state = nextHistory({ open: [], closed: [] }, open, everything, 0);
  state = nextHistory(state, [], everything, 1000);
  assert.equal(state.closed.length, MAX_CLOSED);
  state = nextHistory(state, [], everything, 8 * 24 * 60 * 60 * 1000);
  assert.deepEqual(state.closed, []);
});

test("recordHistory persists through the platform; reopen opens in the tab's app and forgets it", async () => {
  const opened: [string, string | undefined][] = [];
  const platform = fakePlatform({
    openUrl: async (url, appPath) => {
      opened.push([url, appPath]);
    },
  });
  await recordHistory(platform, [page("https://a.com", "A")], everything, 1);
  const [entry] = await recordHistory(platform, [], everything, 2);
  assert.equal(entry.title, "A");
  await reopenClosed(entry, [], platform, async () => {});
  assert.deepEqual(opened, [["https://a.com", chrome.path]]);
  assert.deepEqual(await recordHistory(platform, [], everything, 3), []);
});

// Jump or open, shared by Recently Closed and Bookmarks.

const tab = (browser: App, id: string, url: string, active = false): Tab =>
  chromium.parse(browser, `${id}${F}${url}${F}${url}${F}${active}${R}`)[0];
const entryFor = (t: Tab): Reopenable => reopenable([t])[0];

/**
 * Browsers whose AppleScript lists `open` (tabs by app) and selects any tab id in `selectable`; records what was
 * opened and activated.
 */
function browsers(open: Tab[], selectable = open.map((t) => (t.ref as { tabId: string }).tabId)) {
  const opened: [string, string | undefined][] = [];
  const activated: string[] = [];
  const platform = fakePlatform({
    runAppleScript: async (script) => {
      if (script.includes("set urls to URL of tabs")) {
        const bundleId = /application id "([^"]+)"/.exec(script)![1];
        return open
          .filter((t) => t.app.bundleId === bundleId)
          .map((t) => `${(t.ref as { tabId: string }).tabId}${F}${t.title}${F}${t.url}${F}${t.active}${R}`)
          .join("");
      }
      return selectable.some((id) => script.includes(`is "${id}" then`)) ? "ok" : "missing";
    },
    openUrl: async (url, appPath) => void opened.push([url, appPath]),
  });
  const activate = async (a: App) => void activated.push(a.bundleId);
  return { platform, activate, opened, activated };
}

test("openTabFor: the entry's app's tab first, then another app's active tab; trailing slash ignored", () => {
  const entry = entryFor(tab(chrome, "1", "https://a.com/x"));
  const inBrave = tab(brave, "7", "https://a.com/x/");
  const activeInBrave = tab(brave, "8", "https://a.com/x", true);
  const inChrome = tab(chrome, "2", "https://a.com/x");
  assert.equal(openTabFor(entry, [inBrave, activeInBrave, inChrome]), inChrome);
  assert.equal(openTabFor(entry, [inBrave, activeInBrave]), activeInBrave);
  assert.equal(openTabFor(entry, [inBrave]), inBrave);
  assert.equal(openTabFor(entry, [tab(chrome, "3", "https://a.com/y")]), undefined);
});

test("jumpOrOpen: jumps to a tab opened since the list was read (the entry's app is read again)", async () => {
  const entry = entryFor(tab(chrome, "1", "https://a.com"));
  const b = browsers([tab(chrome, "5", "https://a.com/")]);
  await jumpOrOpen(entry, [], b.platform, b.activate);
  assert.deepEqual(b.activated, [chrome.bundleId]);
  assert.deepEqual(b.opened, []);
});

test("jumpOrOpen: another app's listed tab; else opens it in the entry's app", async () => {
  const entry = entryFor(tab(chrome, "1", "https://a.com"));
  const inBrave = tab(brave, "7", "https://a.com");
  const b = browsers([inBrave]);
  await jumpOrOpen(entry, [inBrave], b.platform, b.activate);
  assert.deepEqual(b.activated, [brave.bundleId]);

  const none = browsers([]);
  await jumpOrOpen(entry, [], none.platform, none.activate);
  assert.deepEqual(none.opened, [["https://a.com", chrome.path]]);
  assert.deepEqual(none.activated, []);
});

test("jumpOrOpen: a listed tab that closed meanwhile opens the entry instead", async () => {
  const entry = entryFor(tab(chrome, "1", "https://a.com"));
  const inBrave = tab(brave, "7", "https://a.com");
  const b = browsers([], []);
  await jumpOrOpen(entry, [inBrave], b.platform, b.activate);
  assert.deepEqual(b.opened, [["https://a.com", chrome.path]]);
  assert.deepEqual(b.activated, []);
});

test("jumpOrOpen: the listed tabs of the entry's app are replaced by the fresh read", async () => {
  const entry = entryFor(tab(chrome, "1", "https://a.com"));
  const b = browsers([]);
  await jumpOrOpen(entry, [tab(chrome, "1", "https://a.com")], b.platform, b.activate);
  assert.deepEqual(b.opened, [["https://a.com", chrome.path]]);
  assert.ok(!b.platform.scripts.some((s) => s.includes('is "1" then')), "no select of the stale tab");
});

test("reopenClosed: jumping to the open tab also takes the entry off Recently Closed", async () => {
  const b = browsers([tab(chrome, "5", "https://a.com")]);
  await recordHistory(b.platform, [page("https://a.com", "A")], everything, 1);
  const [entry] = await recordHistory(b.platform, [], everything, 2);
  await reopenClosed(entry, [], b.platform, b.activate);
  assert.deepEqual(b.activated, [chrome.bundleId]);
  assert.deepEqual(b.opened, []);
  assert.deepEqual(await recordHistory(b.platform, [], everything, 3), []);
});
