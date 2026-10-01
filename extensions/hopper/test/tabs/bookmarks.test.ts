import { test } from "node:test";
import assert from "node:assert/strict";
import { FIELD as F, RECORD as R } from "../../src/lib/tabs/applescript.ts";
import { bookmarkFor, loadBookmarks, renameBookmark, setBookmark } from "../../src/lib/tabs/bookmarks.ts";
import type { App, Tab } from "../../src/lib/tabs/model.ts";
import * as chromium from "../../src/lib/tabs/sources/chromium.ts";
import { app, fakePlatform } from "../fake-platform.ts";

const chrome = app("com.google.Chrome", "Google Chrome");
const muse = app("com.meta.endo", "Muse");
const tab = (browser: App, id: string, url: string, active = false): Tab =>
  chromium.parse(browser, `${id}${F}${url}${F}${url}${F}${active}${R}`)[0];

test("bookmarkFor: what the tab's source can open again, else nothing", () => {
  assert.deepEqual(bookmarkFor(tab(chrome, "1", "https://a.com"))?.reopen, { kind: "url", target: "https://a.com" });
  assert.equal(bookmarkFor(tab(chrome, "1", "chrome://settings")), undefined);
  const museChat: Tab = { key: "m", app: muse, source: "muse", kind: "session", title: "x", active: false, ref: {} };
  assert.equal(bookmarkFor(museChat), undefined);
});

test("add puts newest first, re-adding moves it up; remove drops it", async () => {
  const platform = fakePlatform();
  const [a, b] = [bookmarkFor(tab(chrome, "1", "https://a.com"))!, bookmarkFor(tab(chrome, "2", "https://b.com"))!];
  await setBookmark(platform, a, true, 1);
  await setBookmark(platform, b, true, 2);
  assert.deepEqual(
    (await loadBookmarks(platform)).map((x) => x.id),
    [b.id, a.id],
  );
  await setBookmark(platform, { ...a, title: "A again" }, true, 3);
  assert.deepEqual(
    (await loadBookmarks(platform)).map((x) => [x.id, x.title, x.addedAt]),
    [
      [a.id, "A again", 3],
      [b.id, "https://b.com", 2],
    ],
  );
  assert.deepEqual(
    (await setBookmark(platform, a, false, 4)).map((x) => x.id),
    [b.id],
  );
  assert.deepEqual(await loadBookmarks(platform), await setBookmark(platform, a, false, 5));
});

test("rename changes only that bookmark's title, in place", async () => {
  const platform = fakePlatform();
  const [a, b] = [bookmarkFor(tab(chrome, "1", "https://a.com"))!, bookmarkFor(tab(chrome, "2", "https://b.com"))!];
  await setBookmark(platform, a, true, 1);
  await setBookmark(platform, b, true, 2);
  assert.deepEqual(
    (await renameBookmark(platform, a.id, "My PRs")).map((x) => [x.id, x.title, x.url]),
    [
      [b.id, "https://b.com", "https://b.com"],
      [a.id, "My PRs", "https://a.com"],
    ],
  );
  assert.deepEqual(
    (await loadBookmarks(platform)).map((x) => x.title),
    ["https://b.com", "My PRs"],
  );
});

test("changes made at once all land: each reads the list the one before saved", async () => {
  const store = new Map<string, unknown>();
  // Slow storage, so the changes overlap.
  const platform = fakePlatform({
    loadJson: async <T>(key: string, fallback: T) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return (store.get(key) as T) ?? fallback;
    },
    saveJson: async (key, value) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      store.set(key, value);
    },
  });
  const [a, b] = [bookmarkFor(tab(chrome, "1", "https://a.com"))!, bookmarkFor(tab(chrome, "2", "https://b.com"))!];
  await setBookmark(platform, a, true, 1);
  await Promise.all([setBookmark(platform, b, true, 2), renameBookmark(platform, a.id, "My PRs")]);
  assert.deepEqual(
    (await loadBookmarks(platform)).map((x) => [x.id, x.title]),
    [
      [b.id, "https://b.com"],
      [a.id, "My PRs"],
    ],
  );
});
