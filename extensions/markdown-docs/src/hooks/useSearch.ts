import { useMemo, useState, useCallback } from "react";
import { searchInContent } from "../lib/search";
import type { SearchResult } from "../types";

export function useSearch(content: string) {
  const [query, setQuery] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  const results = useMemo(() => {
    return searchInContent(content, query);
  }, [content, query]);

  const navigateNext = useCallback(() => {
    if (results.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % results.length);
  }, [results.length]);

  const navigatePrev = useCallback(() => {
    if (results.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + results.length) % results.length);
  }, [results.length]);

  const currentResult: SearchResult | null =
    results.length > 0 ? results[currentIndex] : null;

  const reset = useCallback(() => {
    setQuery("");
    setCurrentIndex(0);
  }, []);

  return {
    query,
    setQuery,
    results,
    currentIndex,
    currentResult,
    navigateNext,
    navigatePrev,
    reset,
    matchCount: results.length,
  };
}
