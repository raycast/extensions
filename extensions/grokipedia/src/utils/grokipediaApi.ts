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
 * Callers should debounce user input (see MIN_SEARCH_LENGTH and SEARCH_DEBOUNCE_MS)
 * and pass an empty string when the query should be skipped.
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
 * Execute only when a non-empty query is provided; callers can trigger `revalidate`
 * manually to control when results are fetched.
 */
export function useFullTextSearch(query: string, limit = 12, offset = 0, options?: { execute?: boolean }) {
  const url = buildUrl("/full-text-search", { query, limit, offset });
  return useFetch<FullTextSearchResponse>(url, {
    keepPreviousData: true,
    execute: options?.execute ?? !!query,
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
