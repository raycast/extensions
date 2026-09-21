import { Cache } from "@raycast/api";

/**
 * Pages the reader has already opened, keyed by their raw markdown URL.
 *
 * `LinkContent` caches its own fetch through `useCachedPromise`, but that cache is internal to
 * the hook and unreachable from the list. This shares the rendered text so "Copy as Markdown"
 * can serve a page without refetching it — and can still serve it offline.
 *
 * Entries carry the time they were written because these URLs are stable while the documents
 * behind them are not: without an age, a page read once would be copied unchanged forever.
 * Past `MAX_AGE_MS` an entry is reported stale, which makes it a fallback rather than an answer.
 */
const cache = new Cache({ namespace: "doc-markdown" });

/**
 * A day. Opening a page rewrites its entry, so an entry's age is really "time since you last
 * read this page" — anything read today copies instantly, anything older is re-fetched with the
 * saved copy kept as the offline fallback.
 */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

type CacheEntry = {
  markdown: string;
  /** Epoch milliseconds. */
  fetchedAt: number;
};

export type CachedMarkdown = {
  markdown: string;
  stale: boolean;
};

export function readCachedMarkdown(url: string): CachedMarkdown | undefined {
  let raw: string | undefined;

  try {
    raw = cache.get(url);
  } catch {
    return undefined;
  }

  if (raw === undefined) return undefined;

  try {
    const entry: CacheEntry = JSON.parse(raw);

    // Anything not matching the current shape — including entries written by an older build,
    // which stored a bare string — is treated as a miss rather than trusted or repaired.
    // Number.isFinite, not typeof: JSON.parse turns an overflowing literal into Infinity, which
    // is a number and would make the entry permanently fresh.
    if (typeof entry?.markdown !== "string" || !Number.isFinite(entry?.fetchedAt)) {
      return undefined;
    }

    // A negative age means the clock moved backwards since the write. Call that stale rather
    // than fresh: the copy stays available as a fallback, but it can never suppress a re-fetch.
    const age = Date.now() - entry.fetchedAt;

    return { markdown: entry.markdown, stale: age < 0 || age > MAX_AGE_MS };
  } catch {
    return undefined;
  }
}

/** Best effort: the cache is an optimisation, so a failed write must not take the view down. */
export function writeCachedMarkdown(url: string, markdown: string): void {
  try {
    const entry: CacheEntry = { markdown, fetchedAt: Date.now() };
    cache.set(url, JSON.stringify(entry));
  } catch {
    // Disk full or an unavailable support directory. The next read simply misses and refetches.
  }
}
