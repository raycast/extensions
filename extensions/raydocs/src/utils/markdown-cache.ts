import { Cache } from "@raycast/api";

/**
 * Pages the reader has already opened, keyed by their raw markdown URL.
 *
 * `LinkContent` caches its own fetch through `useCachedPromise`, but that cache is internal to
 * the hook and unreachable from the list. This shares the rendered text so "Copy as Markdown"
 * can serve a page the reader has opened before — including offline, where a fetch cannot.
 *
 * Reads happen inside the action, never during render, so an unused cache costs nothing. The
 * whole published documentation set is ~0.7 MB against `Cache`'s 10 MB default capacity, and
 * eviction is least-recently-used, so the worst case is a refetch.
 */
const cache = new Cache({ namespace: "doc-markdown" });

export function readCachedMarkdown(url: string): string | undefined {
  try {
    return cache.get(url);
  } catch {
    return undefined;
  }
}

/** Best effort: the cache is an optimisation, so a failed write must not take the view down. */
export function writeCachedMarkdown(url: string, markdown: string): void {
  try {
    cache.set(url, markdown);
  } catch {
    // Disk full or an unavailable support directory. The next read simply misses and refetches.
  }
}
