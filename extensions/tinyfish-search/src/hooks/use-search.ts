import { showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { getAuthentication } from "../auth";
import { MAX_SEARCH_PAGE, searchTinyFish, type SearchFilters, type SearchResult } from "../tinyfish";
import { library } from "../library";

type SearchState = {
  results: SearchResult[];
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  error?: string;
};

export function useSearch(query: string, filters: SearchFilters, preferences: Preferences) {
  const [state, setState] = useState<SearchState>({ results: [], page: -1, hasMore: false, isLoading: false });
  const controller = useRef<AbortController | null>(null);
  const loading = useRef(false);

  async function loadPage(page: number, signal: AbortSignal) {
    loading.current = true;
    setState((state) => ({ ...state, isLoading: true, error: undefined }));
    try {
      const response = await searchTinyFish({
        query,
        filters,
        page,
        location: preferences.location,
        language: preferences.language,
        authentication: await getAuthentication(),
        signal,
      });
      if (signal.aborted) return;
      setState((state) => {
        const results = page === 0 ? [] : state.results;
        const seen = new Set(results.map((result) => result.url));
        return {
          results: [
            ...results,
            ...response.results.filter((result) => {
              if (seen.has(result.url)) return false;
              seen.add(result.url);
              return true;
            }),
          ],
          page,
          hasMore: response.results.length > 0 && page < MAX_SEARCH_PAGE,
          isLoading: false,
        };
      });
      if (page === 0 && preferences.rememberHistory) {
        void library
          .recordSearch({ query, filters, location: preferences.location, language: preferences.language })
          .catch(() => {
            void showToast({ style: Toast.Style.Failure, title: "Could not save search history" });
          });
      }
    } catch (error) {
      if (signal.aborted) return;
      const message = error instanceof Error ? error.message : "Unknown error";
      setState((state) => ({ ...state, isLoading: false, error: message }));
      await showToast({ style: Toast.Style.Failure, title: "Search failed", message });
    } finally {
      if (!signal.aborted) loading.current = false;
    }
  }

  // Keep the latest inputs without restarting a request when loading state changes.
  const loadPageRef = useRef(loadPage);
  loadPageRef.current = loadPage;

  useEffect(() => {
    const request = new AbortController();
    controller.current = request;
    loading.current = Boolean(query);
    setState({ results: [], page: -1, hasMore: false, isLoading: Boolean(query) });
    const timeout = query ? setTimeout(() => void loadPageRef.current(0, request.signal), 350) : undefined;
    return () => {
      request.abort();
      clearTimeout(timeout);
    };
  }, [query, filters, preferences.location, preferences.language]);

  function loadMore() {
    if (!state.hasMore || loading.current || !controller.current) return;
    void loadPageRef.current(state.page + 1, controller.current.signal);
  }

  function retry() {
    if (loading.current || !controller.current || !query) return;
    void loadPageRef.current(state.results.length ? state.page + 1 : 0, controller.current.signal);
  }

  return { ...state, loadMore, retry };
}
