import { sleep as realSleep } from "../sleep";
import type { Page } from "./types";

export interface SyncOptions<T> {
  sleep?: (ms: number) => Promise<void>;
  pageDelayMs?: number;
  /**
   * Page path where an earlier, interrupted first load stopped. After the newest pages
   * reach the cache, older pages are fetched from here to the end. Ignored without a cache.
   */
  resumeFrom?: string | null;
  /**
   * Called whenever the merged list (newest-first, deduped) grows without a gap, with the
   * page path to pass as `resumeFrom` if the sync stops now (null once the history is complete).
   * Persist both to keep a partial first load.
   */
  onProgress?: (itemsSoFar: T[], resumeFrom: string | null) => void;
  /**
   * True when an error from fetching `resumeFrom` means the cursor itself is no longer
   * accepted. The older pages are then rebuilt by walking the whole history from the newest page.
   */
  isRejectedCursor?: (err: unknown) => boolean;
  /** Milliseconds to wait before retrying a page once when `err` is a rate limit; null for other errors. */
  rateLimitWaitMs?: (err: unknown) => number | null;
}

/**
 * Fetches pages newest-first until the end, or until a page contains an already
 * cached key, then continues from `resumeFrom` if given. Returns the merged list,
 * newest-first and deduped by key.
 */
export async function syncHistory<T>(
  fetchPage: (next: string | null) => Promise<Page<T>>,
  cached: T[],
  keyOf: (item: T) => string,
  opts: SyncOptions<T> = {},
): Promise<T[]> {
  const sleep = opts.sleep ?? realSleep;
  const pageDelayMs = opts.pageDelayMs ?? 3000;
  const cachedKeys = new Set(cached.map(keyOf));

  const newer: T[] = [];
  const older: T[] = [];
  const merged = () => {
    const seen = new Set<string>();
    const result: T[] = [];
    for (const item of [...newer, ...cached, ...older]) {
      const key = keyOf(item);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(item);
    }
    return result;
  };

  let first = true;
  const fetchNext = async (next: string | null) => {
    if (!first) await sleep(pageDelayMs);
    first = false;
    try {
      return await fetchPage(next);
    } catch (err) {
      const wait = opts.rateLimitWaitMs?.(err) ?? null;
      if (wait === null) throw err;
      await sleep(wait);
      return fetchPage(next);
    }
  };

  // Newest pages, until they reach the cache or the end. With a cache, a partial result
  // here would leave a gap before the cached items, so progress is only reported on a first load.
  let resume: string | null = cached.length > 0 ? (opts.resumeFrom ?? null) : null;
  let next: string | null = null;
  for (;;) {
    const page = await fetchNext(next);
    newer.push(...page.items);
    const reachedCache = page.items.some((item) => cachedKeys.has(keyOf(item)));
    if (!reachedCache && !page.nextPagePath) resume = null;
    if (cached.length === 0) {
      resume = page.nextPagePath;
      opts.onProgress?.(merged(), resume);
    }
    if (reachedCache || !page.nextPagePath) break;
    next = page.nextPagePath;
  }
  if (cached.length > 0) opts.onProgress?.(merged(), resume);

  // Older pages an interrupted first load never reached.
  let rebuilding = false;
  while (resume) {
    let page: Page<T>;
    try {
      page = await fetchNext(resume);
    } catch (err) {
      if (rebuilding || !opts.isRejectedCursor?.(err)) throw err;
      rebuilding = true;
      page = await fetchNext(null);
    }
    older.push(...page.items);
    resume = page.nextPagePath;
    opts.onProgress?.(merged(), resume);
  }
  return merged();
}
