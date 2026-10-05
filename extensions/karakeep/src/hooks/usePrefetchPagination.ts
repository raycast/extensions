import { useEffect, useRef } from "react";

type Pagination = {
  pageSize: number;
  hasMore: boolean;
  onLoadMore: () => void;
};

/**
 * Raycast pagination triggers `onLoadMore` on scroll-to-bottom.
 * When a command is reopened, `useCachedPromise` may return only the cached first page immediately (e.g. 10 items),
 * leaving the list not scrollable and thus preventing `onLoadMore` from ever firing.
 *
 * This hook prefetches additional pages (up to `maxPrefetches`) when it detects this "not scrollable" scenario.
 */
export function useEnsureScrollablePagination(options: {
  pagination?: Pagination;
  isLoading: boolean;
  itemCount: number;
  enabled?: boolean;
  maxPrefetches?: number;
  /**
   * The last fetch's error, if any. Required to avoid duplicating the list —
   * see the offline note below.
   */
  error?: unknown;
  /**
   * Whether the rows on screen came from a request that actually succeeded this
   * session (as opposed to being restored from the on-disk cache).
   */
  hasLiveData?: boolean;
}) {
  const prefetchedCount = useRef(0);
  const enabled = options.enabled ?? true;
  const maxPrefetches = options.maxPrefetches ?? 3;

  useEffect(() => {
    const { pagination, isLoading, itemCount, error, hasLiveData } = options;
    if (!enabled) return;
    if (!pagination || !pagination.hasMore) return;
    if (isLoading) return;
    if (prefetchedCount.current >= maxPrefetches) return;
    if (itemCount <= 0) return;

    // NEVER prefetch against a server we haven't heard from. useCachedPromise
    // REPLACES on page 0 and CONCATS on page > 0, and onLoadMore increments the
    // page counter immediately — before the request resolves. So calling it
    // while offline advances the counter, the request fails, and the next
    // successful fetch lands as page 1 and is concatenated onto the rows that
    // were restored from cache. Result: every bookmark twice.
    //
    // raycast/extensions#30021: cached list renders once offline, then doubles
    // on reconnect. `hasLiveData` is the load-bearing half — on a cold offline
    // start there is no error yet, just restored cache.
    if (error) return;
    if (hasLiveData === false) return;

    // Heuristic: if we only have up to one page of items, it's likely not scrollable yet.
    if (itemCount <= pagination.pageSize) {
      prefetchedCount.current += 1;
      pagination.onLoadMore();
    }
  }, [
    enabled,
    maxPrefetches,
    options.isLoading,
    options.itemCount,
    options.error,
    options.hasLiveData,
    options.pagination?.hasMore,
    options.pagination?.pageSize,
    options.pagination?.onLoadMore,
  ]);
}
