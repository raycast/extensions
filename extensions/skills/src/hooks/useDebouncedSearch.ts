import { useCallback, useEffect, useRef, useState } from "react";

import { type SearchResponse, API_BASE_URL, deduplicateSkills } from "../shared";

export function useDebouncedSearch(searchText: string, delay = 300) {
  const [data, setData] = useState<SearchResponse | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSkills = useCallback(async (query: string, signal: AbortSignal) => {
    const url = `${API_BASE_URL}/search?q=${encodeURIComponent(query)}&limit=50`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as SearchResponse;
    return { ...data, skills: deduplicateSkills(data.skills) };
  }, []);

  const executeSearch = useCallback(
    async (query: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);
      try {
        const result = await fetchSkills(query, controller.signal);
        if (!controller.signal.aborted) {
          setData(result);
          setError(undefined);
        }
      } catch (e) {
        if (!controller.signal.aborted && e instanceof Error && e.name !== "AbortError") {
          setError(e);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    },
    [fetchSkills],
  );

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (searchText.length < 2) {
      setData(undefined);
      setIsLoading(false);
      setError(undefined);
      return;
    }

    setIsLoading(true);
    timerRef.current = setTimeout(() => executeSearch(searchText), delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [searchText, delay, executeSearch]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const revalidate = useCallback(async () => {
    if (searchText.length < 2) return;
    await executeSearch(searchText);
  }, [searchText, executeSearch]);

  const searchUrl = searchText.length >= 2 ? `${API_BASE_URL}/search?q=${encodeURIComponent(searchText)}&limit=50` : "";

  return { data, isLoading, error, revalidate, searchUrl };
}
