import { useFetch, AsyncState } from "@raycast/utils";
import type { TypeaheadResponse, FullTextSearchResponse, StatsResponseRaw, Stats, PageResponse } from "../types";
import { buildUrl } from "./apiClient";
import { mapStats } from "./transforms";

/**
 * Fetches site statistics and normalises numeric fields.
 * Wraps `useFetch` and transforms the raw response.
 */
export function useStats() {
  return useFetch<StatsResponseRaw, Stats>(buildUrl("/stats"), {
    mapResult(raw: StatsResponseRaw) {
      return { data: mapStats(raw) };
    },
  });
}

/**
 * Fetches typeahead suggestions.
 * Only executes if a query is provided. Returns empty results when query is empty.
 * Note: Rate limiting is handled by the Raycast List component's `throttle` prop.
 */
export function useTypeahead(query: string, limit = 5) {
  const url = buildUrl("/typeahead", { query, limit });

  const fetchResult = useFetch<TypeaheadResponse>(url, {
    execute: !!query,
    // keepPreviousData removed: typeahead users expect fresh results immediately
  });

  if (!query) {
    return {
      data: { results: [], searchTimeMs: 0 },
      isLoading: false,
      error: undefined,
      revalidate: fetchResult.revalidate,
      mutate: fetchResult.mutate,
    } as AsyncState<TypeaheadResponse> & {
      revalidate: () => void;
      mutate: (
        asyncUpdate?: Promise<TypeaheadResponse | undefined>,
        options?: {
          optimisticUpdate?: (data: TypeaheadResponse) => TypeaheadResponse;
          rollbackOnError?: boolean | ((data: TypeaheadResponse) => TypeaheadResponse);
          shouldRevalidateAfter?: boolean;
        },
      ) => Promise<TypeaheadResponse | undefined>;
    };
  }

  return fetchResult;
}

/**
 * Fetches full-text search results.
 */
export function useFullTextSearch(query: string, limit = 12, offset = 0) {
  const url = buildUrl("/full-text-search", { query, limit, offset });
  return useFetch<FullTextSearchResponse>(url, {
    keepPreviousData: true,
  });
}

/**
 * Fetches a page by its slug.
 */
export function usePage(slug: string, includeContent = false, validateLinks = true) {
  const url = buildUrl("/page", { slug, includeContent, validateLinks });
  return useFetch<PageResponse>(url, {});
}

export default {
  useStats,
  useTypeahead,
  useFullTextSearch,
  usePage,
};
