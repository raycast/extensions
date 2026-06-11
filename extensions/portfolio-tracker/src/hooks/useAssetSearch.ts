/**
 * React hook for debounced asset search via Yahoo Finance.
 *
 * Provides type-ahead search functionality for the "Search Investments" command
 * and the "Add Position" flow. Debounces user input to avoid excessive API calls
 * while typing, and returns structured search results.
 *
 * Features:
 * - Debounced search (configurable delay, default 350ms)
 * - Automatic loading state management
 * - Error handling with classification (offline vs API error)
 * - Empty query returns empty results (no API call)
 * - Cancels in-flight requests when query changes
 *
 * Usage:
 * ```
 * const { results, isLoading, error } = useAssetSearch(searchText);
 * ```
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { AssetSearchResult, PortfolioError } from "../utils/types";
import { searchAssets } from "../services/yahoo-finance";
import { createPortfolioError } from "../utils/errors";
import { SEARCH_DEBOUNCE_MS } from "../utils/constants";

// ──────────────────────────────────────────
// Return Type
// ──────────────────────────────────────────

export interface UseAssetSearchReturn {
  /** Array of matching securities from the most recent search */
  results: AssetSearchResult[];

  /** Whether a search request is currently in flight */
  isLoading: boolean;

  /** The most recent error, or undefined if the last search succeeded */
  error: PortfolioError | undefined;

  /** The query string that produced the current results */
  searchedQuery: string;
}

// ──────────────────────────────────────────
// Hook Implementation
// ──────────────────────────────────────────

/**
 * Debounced asset search hook.
 *
 * @param query - The current search text (updates on every keystroke)
 * @param debounceMs - Debounce delay in milliseconds (default: SEARCH_DEBOUNCE_MS)
 * @returns Search results, loading state, and any errors
 *
 * @example
 * function SearchView() {
 *   const [searchText, setSearchText] = useState("");
 *   const { results, isLoading, error } = useAssetSearch(searchText);
 *
 *   return (
 *     <List isLoading={isLoading} onSearchTextChange={setSearchText}>
 *       {results.map((r) => (
 *         <List.Item key={r.symbol} title={r.name} subtitle={r.symbol} />
 *       ))}
 *     </List>
 *   );
 * }
 */
export function useAssetSearch(query: string, debounceMs: number = SEARCH_DEBOUNCE_MS): UseAssetSearchReturn {
  const [results, setResults] = useState<AssetSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<PortfolioError | undefined>(undefined);
  const [searchedQuery, setSearchedQuery] = useState("");

  // Ref to track the latest query for cancellation logic.
  // When a new query arrives, any in-flight request for an older query
  // should be discarded (its results are no longer relevant).
  const latestQueryRef = useRef(query);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track whether the component is still mounted
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Core search function (not debounced)
  const executeSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();

    // Empty query — clear results immediately, no API call
    if (trimmed.length === 0) {
      if (isMountedRef.current) {
        setResults([]);
        setIsLoading(false);
        setError(undefined);
        setSearchedQuery("");
      }
      return;
    }

    if (isMountedRef.current) {
      setIsLoading(true);
      setError(undefined);
    }

    try {
      const searchResults = await searchAssets(trimmed);

      // Only update state if this is still the latest query
      // (prevents stale results from overwriting newer ones)
      if (isMountedRef.current && latestQueryRef.current === searchQuery) {
        setResults(searchResults);
        setSearchedQuery(trimmed);
        setError(undefined);
      }
    } catch (err) {
      // Only update error state if this is still the latest query
      if (isMountedRef.current && latestQueryRef.current === searchQuery) {
        const portfolioError = createPortfolioError(err);
        setError(portfolioError);
        // Keep previous results visible on error (better UX than clearing)
      }
    } finally {
      if (isMountedRef.current && latestQueryRef.current === searchQuery) {
        setIsLoading(false);
      }
    }
  }, []);

  // Debounced effect: triggers search after the user stops typing
  useEffect(() => {
    latestQueryRef.current = query;

    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = query.trim();

    // For empty queries, clear immediately (no debounce needed)
    if (trimmed.length === 0) {
      setResults([]);
      setIsLoading(false);
      setError(undefined);
      setSearchedQuery("");
      return;
    }

    // Show loading indicator immediately (responsive feel)
    setIsLoading(true);

    // Debounce the actual API call
    debounceTimerRef.current = setTimeout(() => {
      executeSearch(query);
    }, debounceMs);

    // Cleanup: cancel the debounce timer if the query changes or component unmounts
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [query, debounceMs, executeSearch]);

  return {
    results,
    isLoading,
    error,
    searchedQuery,
  };
}
