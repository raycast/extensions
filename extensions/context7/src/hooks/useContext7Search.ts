/**
 * Custom hook for Context7 search with debouncing
 */

import { useState, useEffect } from "react";
import { SearchResponse, APIError } from "../lib/types";
import { search } from "../lib/api";

/**
 * Hook for searching Context7 with debounce
 * @param query - Search query text
 * @param debounceMs - Debounce delay in milliseconds (default: 300ms)
 */
export function useContext7Search(query: string, debounceMs = 300) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<SearchResponse | undefined>(undefined);
  const [error, setError] = useState<APIError | undefined>(undefined);

  // Debounce the query
  useEffect(() => {
    // Show loading immediately when user types
    if (query.trim() && query !== debouncedQuery) {
      setIsLoading(true);
    }

    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [query, debounceMs, debouncedQuery]);

  // Execute search when debounced query changes
  useEffect(() => {
    // Don't search for empty queries
    if (!debouncedQuery.trim()) {
      setData(undefined);
      setError(undefined);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const executeSearch = async () => {
      setIsLoading(true);
      setError(undefined);

      try {
        const result = await search(debouncedQuery);

        if (!cancelled) {
          setData(result);
          setError(undefined);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as APIError);
          setData(undefined);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    executeSearch();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  return {
    data,
    isLoading,
    error,
  };
}
