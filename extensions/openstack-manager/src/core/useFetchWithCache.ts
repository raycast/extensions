import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * React hook that fetches data with persistent LocalStorage caching.
 *
 * Pattern (same as GCP Search extension):
 * 1. On mount, immediately loads cached data from LocalStorage → shows UI fast
 * 2. Calls the fetcher in the background to get fresh data
 * 3. Updates the UI with fresh data and persists it to LocalStorage
 * 4. If the fetch fails and cached data exists, keeps showing cached data
 * 5. If the fetch fails and no cached data exists, sets error state
 *
 * Uses a ref for the fetcher to avoid infinite re-renders when the caller
 * creates a new function reference each render (e.g. from useCallback
 * with a useMemo-created service).
 *
 * @param cacheKey - Unique key for LocalStorage
 * @param fetcher - Async function that returns fresh data
 */
export function useFetchWithCache<T>(cacheKey: string, fetcher: () => Promise<T>) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [state, setState] = useState<{
    data?: T;
    error?: Error;
    isLoading: boolean;
  }>({ isLoading: true });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Step 1: Load cached data immediately
      try {
        const cached = await LocalStorage.getItem<string>(cacheKey);
        if (cached && !cancelled) {
          setState((prev) => ({ ...prev, data: JSON.parse(cached) }));
        }
      } catch {
        // Ignore cache read errors
      }

      // Step 2: Fetch fresh data in background
      try {
        const freshData = await fetcherRef.current();
        if (!cancelled) {
          setState((prev) => ({ ...prev, data: freshData, isLoading: false }));
          await LocalStorage.setItem(cacheKey, JSON.stringify(freshData));
        }
      } catch (e) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            error: e as Error,
            isLoading: false,
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cacheKey]);

  const revalidate = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const freshData = await fetcherRef.current();
      setState((prev) => ({ ...prev, data: freshData, isLoading: false, error: undefined }));
      await LocalStorage.setItem(cacheKey, JSON.stringify(freshData));
    } catch (e) {
      setState((prev) => ({ ...prev, error: e as Error, isLoading: false }));
    }
  }, [cacheKey]);

  return { ...state, revalidate };
}
