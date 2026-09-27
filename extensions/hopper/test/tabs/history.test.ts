import { test } from "node:test";
import assert from "node:assert/strict";
import { nextHistory, recordHistory, reopenClosed, reopenable, MAX_CLOSED } from "../../src/lib/tabs/history.ts";
import { fileReopenTarget, webReopenTarget } from "../../src/lib/tabs/reopen.ts";
import { fromWindows } from "../../src/lib/tabs/sources/windows.ts";
import type { Tab } from "../../src/lib/tabs/model.ts";
import { app, fakePlatform } from "../fake-platform.ts";

const chrome = app("com.google.Chrome", "Google Chrome");
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
  await reopenClosed(entry, platform);
  assert.deepEqual(opened, [["https://a.com", chrome.path]]);
  assert.deepEqual(await recordHistory(platform, [], everything, 3), []);
});
