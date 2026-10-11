// PURE: Bookmarks. Pages, notes, and files saved from Search (a tab or a Recently Closed entry) to come back to.
// Picking one jumps to a tab already showing it, in any app, and only opens it (in the app it was saved from) when
// none is, like Recently Closed (history.ts's jumpOrOpen). What can be bookmarked is what can be reopened: a
// source's reopenTarget (a web page, a file, a Notion or Obsidian link), so private windows never get here either
// (ADR-018).

import type { ClosedTab } from "./history";
import { reopenable } from "./history";
import type { Platform, Tab } from "./model";

/** Same shape as a Recently Closed entry: `id` is `<bundleId> <target>`, `app` the app it was saved from. */
export type Bookmark = Omit<ClosedTab, "closedAt"> & { addedAt: number };

const KEY = "tabs:bookmarks";

/** Newest first. */
export function loadBookmarks(platform: Platform): Promise<Bookmark[]> {
  return platform.loadJson<Bookmark[]>(KEY, []);
}

/** What bookmarking `tab` would save, or undefined if its source can't open it again. */
export function bookmarkFor(tab: Tab): Omit<Bookmark, "addedAt"> | undefined {
  return reopenable([tab])[0];
}

/** `bookmarks` with `entry` on top; bookmarking the same thing again moves it there with its new title. */
export function withBookmark(bookmarks: Bookmark[], entry: Omit<Bookmark, "addedAt">, now: number): Bookmark[] {
  const { id, app, kind, title, detail, url, link, reopen } = entry;
  return [
    { id, app, kind, title, detail, url, ...(link ? { link } : {}), reopen, addedAt: now },
    ...withoutBookmark(bookmarks, id),
  ];
}

export function withoutBookmark(bookmarks: Bookmark[], id: string): Bookmark[] {
  return bookmarks.filter((b) => b.id !== id);
}

/** The last change to the saved list; each change waits for it, so two quick ones can't read the same list. */
let lastChange: Promise<unknown> = Promise.resolve();

/** Applies `change` to the saved bookmarks, one change at a time, and returns the bookmarks after. */
function changeBookmarks(platform: Platform, change: (bookmarks: Bookmark[]) => Bookmark[]): Promise<Bookmark[]> {
  const run = lastChange.then(async () => {
    const next = change(await loadBookmarks(platform));
    await platform.saveJson(KEY, next);
    return next;
  });
  lastChange = run.catch(() => undefined);
  return run;
}

/** Adds `entry` (`on`) or removes it, and returns the bookmarks after. */
export function setBookmark(
  platform: Platform,
  entry: Omit<Bookmark, "addedAt">,
  on: boolean,
  now: number,
): Promise<Bookmark[]> {
  return changeBookmarks(platform, (bookmarks) =>
    on ? withBookmark(bookmarks, entry, now) : withoutBookmark(bookmarks, entry.id),
  );
}

/** `bookmarks` with `id` named `title` (a clean name for a long URL or a generic page title); order unchanged. */
export function withTitle(bookmarks: Bookmark[], id: string, title: string): Bookmark[] {
  return bookmarks.map((b) => (b.id === id ? { ...b, title } : b));
}

/** Renames the bookmark `id`, and returns the bookmarks after. */
export function renameBookmark(platform: Platform, id: string, title: string): Promise<Bookmark[]> {
  return changeBookmarks(platform, (bookmarks) => withTitle(bookmarks, id, title));
}
