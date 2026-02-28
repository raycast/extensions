import { useState, useEffect, useCallback } from "react";
import { showToast, Toast } from "@raycast/api";
import { apiClient } from "../api/client";
import { Recording, SearchResult } from "../types";

interface UseTldvDataResult {
  recordings: Recording[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useTldvData(): UseTldvDataResult {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchRecordings = useCallback(async (pageNum: number, append = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.getRecordings(pageNum, 20);

      if (response.error && !response.error.includes("Mock mode enabled")) {
        throw new Error(response.error);
      }

      if (response.data) {
        const items = response.data.items || [];
        if (append) {
          setRecordings((prev) => [...prev, ...items]);
        } else {
          setRecordings(items);
        }
        setHasMore(response.data.hasMore || false);
      } else {
        // If no data, set empty array
        if (!append) {
          setRecordings([]);
        }
        setHasMore(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch recordings";
      // Don't show error for mock mode message
      if (!errorMessage.includes("Mock mode enabled")) {
        setError(errorMessage);
        // Only show toast for actual errors, not 404s when API key is not configured
        if (!errorMessage.includes("404") && !errorMessage.includes("Not Found")) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: errorMessage,
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecordings(1);
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;

    const nextPage = page + 1;
    setPage(nextPage);
    await fetchRecordings(nextPage, true);
  }, [page, hasMore, isLoading, fetchRecordings]);

  const refresh = useCallback(async () => {
    setPage(1);
    await fetchRecordings(1);
  }, [fetchRecordings]);

  return {
    recordings,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}

interface UseSearchDataResult {
  searchResults: SearchResult[];
  isSearching: boolean;
  searchError: string | null;
  hasMoreResults: boolean;
  search: (query: string) => Promise<void>;
  loadMoreResults: () => Promise<void>;
  clearResults: () => void;
}

export function useSearchData(): UseSearchDataResult {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [currentQuery, setCurrentQuery] = useState("");
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(false);

  const performSearch = useCallback(async (query: string, pageNum = 1, append = false) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      setSearchError(null);

      const response = await apiClient.searchRecordings({
        query,
        page: pageNum,
        pageSize: 20,
        sortBy: "relevance",
      });

      if (response.error && !response.error.includes("Mock mode enabled")) {
        throw new Error(response.error);
      }

      if (response.data) {
        const items = response.data.items || [];
        if (append) {
          setSearchResults((prev) => [...prev, ...items]);
        } else {
          setSearchResults(items);
        }
        setHasMoreResults(response.data.hasMore || false);
      } else {
        // If no data, set empty array
        if (!append) {
          setSearchResults([]);
        }
        setHasMoreResults(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Search failed";
      setSearchError(errorMessage);
      await showToast({
        style: Toast.Style.Failure,
        title: "Search Error",
        message: errorMessage,
      });
    } finally {
      setIsSearching(false);
    }
  }, []);

  const search = useCallback(
    async (query: string) => {
      setCurrentQuery(query);
      setSearchPage(1);
      await performSearch(query, 1);
    },
    [performSearch],
  );

  const loadMoreResults = useCallback(async () => {
    if (!hasMoreResults || isSearching || !currentQuery) return;

    const nextPage = searchPage + 1;
    setSearchPage(nextPage);
    await performSearch(currentQuery, nextPage, true);
  }, [searchPage, hasMoreResults, isSearching, currentQuery, performSearch]);

  const clearResults = useCallback(() => {
    setSearchResults([]);
    setCurrentQuery("");
    setSearchPage(1);
    setHasMoreResults(false);
    setSearchError(null);
  }, []);

  return {
    searchResults,
    isSearching,
    searchError,
    hasMoreResults,
    search,
    loadMoreResults,
    clearResults,
  };
}
