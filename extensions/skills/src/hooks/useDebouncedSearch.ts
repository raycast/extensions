import { useCallback, useEffect, useRef, useState } from "react";

import { type SearchResponse } from "../shared";
import { fetchSkillsSearch, buildSkillsSearchUrl } from "../api";

export function useDebouncedSearch(searchText: string, delay = 300) {
  const [data, setData] = useState<SearchResponse | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQueryRef = useRef("");

  const executeSearch = useCallback(async (query: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    try {
      const result = await fetchSkillsSearch(query, controller.signal);
      if (!controller.signal.aborted && latestQueryRef.current === query) {
        setData(result);
        setError(undefined);
      }
    } catch (e) {
      if (
        !controller.signal.aborted &&
        latestQueryRef.current === query &&
        e instanceof Error &&
        e.name !== "AbortError"
      ) {
        setData(undefined);
        setError(e);
      }
    } finally {
      if (!controller.signal.aborted && latestQueryRef.current === query) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    latestQueryRef.current = searchText;

    if (searchText.length < 2) {
      abortRef.current?.abort();
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

  const searchUrl = searchText.length >= 2 ? buildSkillsSearchUrl(searchText) : "";

  return { data, isLoading, error, revalidate, searchUrl };
}
