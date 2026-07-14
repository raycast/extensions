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
}) {
  const prefetchedCount = useRef(0);
  const enabled = options.enabled ?? true;
  const maxPrefetches = options.maxPrefetches ?? 3;

  useEffect(() => {
    const { pagination, isLoading, itemCount } = options;
    if (!enabled) return;
    if (!pagination || !pagination.hasMore) return;
    if (isLoading) return;
    if (prefetchedCount.current >= maxPrefetches) return;
    if (itemCount <= 0) return;

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
    options.pagination?.hasMore,
    options.pagination?.pageSize,
    options.pagination?.onLoadMore,
  ]);
}
