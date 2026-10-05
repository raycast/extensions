import { usePromise } from "@raycast/utils";
import { useRef, useMemo, useDeferredValue } from "react";
import { SefariaApi } from "../api/sefaria";
import { InfiniteSearchReturn, InfiniteSearchData, CategorySearchReturn, CategorySearchData } from "../types/sefaria";

const DEFAULT_PAGE_SIZE = 20;

/**
 * Hook for searching Sefaria texts with infinite scroll support
 */
export function useSefariaInfiniteSearch(query: string): InfiniteSearchReturn {
  const totalCountRef = useRef<number>(0);

  // Use deferred value to prevent jarring updates during pagination
  const deferredQuery = useDeferredValue(query);

  const { data, isLoading, error, pagination } = usePromise(
    (searchQuery: string) => async (options: { page: number }) => {
      if (!searchQuery.trim()) {
        totalCountRef.current = 0;
        return {
          data: [],
          hasMore: false,
        };
      }

      const pageSize = DEFAULT_PAGE_SIZE;
      const from = options.page * pageSize;

      const response = await SefariaApi.search(searchQuery, pageSize, from);

      const results = response.hits.hits;
      const totalResults = typeof response.hits.total === "object" ? response.hits.total.value : response.hits.total;
      const hasMore = from + results.length < totalResults;

      // Store total count from first page
      if (options.page === 0) {
        totalCountRef.current = totalResults;
      }

      return {
        data: results,
        hasMore,
      };
    },
    [deferredQuery],
    {
      execute: deferredQuery.length > 0,
    },
  );

  // Memoize the transformed data to maintain stable references and prevent re-renders
  const transformedData: InfiniteSearchData | undefined = useMemo(() => {
    if (!data) return undefined;

    // Flatten all pages into a single array, but maintain stable reference
    const allResults = data.flatMap((page) => page);

    return {
      results: allResults,
      totalCount: totalCountRef.current,
      hasMore: pagination ? pagination.hasMore : false,
    };
  }, [data, pagination]);

  // Indicate if we're showing stale data while new data loads
  const isStale = query !== deferredQuery;

  return {
    data: transformedData,
    isLoading: isLoading || isStale,
    error,
    pagination: pagination || { hasMore: false, onLoadMore: () => {}, pageSize: DEFAULT_PAGE_SIZE },
  };
}

/**
 * Hook for category-based search
 */
export function useSefariaCategories(query: string): CategorySearchReturn {
  // Use deferred value to prevent jarring updates
  const deferredQuery = useDeferredValue(query);

  const { data, isLoading, error } = usePromise(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        return [];
      }
      return SefariaApi.searchWithCategories(searchQuery);
    },
    [deferredQuery],
    {
      execute: deferredQuery.length > 0,
    },
  );

  // Transform data to match expected structure
  const transformedData: CategorySearchData | undefined = useMemo(() => {
    if (!data) return undefined;

    const totalCount = data.reduce((sum, category) => sum + category.count, 0);

    return {
      categories: data,
      totalCount,
      hasMore: false, // Category view doesn't need pagination
    };
  }, [data]);

  // Indicate if we're showing stale data while new data loads
  const isStale = query !== deferredQuery;

  return {
    data: transformedData,
    isLoading: isLoading || isStale,
    error,
    pagination: { hasMore: false, onLoadMore: () => {}, pageSize: DEFAULT_PAGE_SIZE },
  };
}

/**
 * Hook for getting Sefaria text content
 */
export function useSefariaText(reference: string) {
  return usePromise(
    async (ref: string) => {
      return SefariaApi.getText(ref);
    },
    [reference],
    {
      execute: !!reference.trim(),
    },
  );
}
