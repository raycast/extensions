import { useState, useCallback, useRef, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { searchLinks } from "../lib/api";
import { isAuthError } from "../lib/errors";
import { searchCachedLinks, getAllCachedLinks, groupResults } from "../lib/search-utils";
import type { GroupedSearchResults, CachedData } from "../types";

interface UseSearchResult {
  groupedResults: GroupedSearchResults;
  isLoading: boolean;
  error: Error | undefined;
  query: string;
  search: (query: string) => void;
}

/**
 * Hook for searching FAVORO bookmarks.
 * Searches cache first for instant results, falls back to API if cache is unavailable.
 */
export function useSearch(cache?: CachedData): UseSearchResult {
  const [groupedResults, setGroupedResults] = useState<GroupedSearchResults>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [query, setQuery] = useState("");

  // Track the latest search to avoid race conditions
  const latestSearchRef = useRef<string>("");

  // Show all links when cache becomes available (on initial load)
  useEffect(() => {
    if (cache && cache.links.length > 0 && !query.trim()) {
      const allLinks = getAllCachedLinks(cache);
      setGroupedResults(groupResults(allLinks));
    }
  }, [cache, query]);

  const search = useCallback(
    async (searchQuery: string): Promise<void> => {
      setQuery(searchQuery);
      latestSearchRef.current = searchQuery;

      // For empty query, show all cached links
      if (!searchQuery.trim()) {
        if (cache && cache.links.length > 0) {
          const allLinks = getAllCachedLinks(cache);
          setGroupedResults(groupResults(allLinks));
        } else {
          setGroupedResults({});
        }
        setIsLoading(false);
        setError(undefined);
        return;
      }

      // Try cache first for instant results
      if (cache && cache.links.length > 0) {
        const cachedResults = searchCachedLinks(searchQuery, cache);
        setGroupedResults(groupResults(cachedResults));
        // Don't set isLoading or call API - cache is sufficient
        return;
      }

      // Fall back to API search when cache is unavailable
      setIsLoading(true);
      setError(undefined);

      try {
        const searchResults = await searchLinks(searchQuery);

        // Only update if this is still the latest search
        if (latestSearchRef.current === searchQuery) {
          setGroupedResults(groupResults(searchResults));
        }
      } catch (err) {
        // Only update if this is still the latest search
        if (latestSearchRef.current === searchQuery) {
          const searchError = err instanceof Error ? err : new Error("Search failed");
          setError(searchError);

          // Show toast for errors, but special handling for auth errors
          if (isAuthError(err)) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Authentication Required",
              message: "Please reconnect to FAVORO",
            });
          } else {
            await showToast({
              style: Toast.Style.Failure,
              title: "Search Failed",
              message: searchError.message,
            });
          }
        }
      } finally {
        // Only update loading state if this is still the latest search
        if (latestSearchRef.current === searchQuery) {
          setIsLoading(false);
        }
      }
    },
    [cache],
  );

  return {
    groupedResults,
    isLoading,
    error,
    query,
    search,
  };
}
