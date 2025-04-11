import { useNavigation, Toast } from "@raycast/api";
import { useState, useRef } from "react";
import { Duration } from "luxon";

import { Sourcegraph } from "../sourcegraph";
import { PatternType, performSearch, SearchResult, Suggestion } from "../sourcegraph/stream-search";
import { SearchHistory } from "../searchHistory";

import ExpandableToast from "../components/ExpandableToast";

export interface SearchState {
  /**
   * Set of all results received, up to the provided maximum
   */
  results: SearchResult[];
  /**
   * Whether the results are from a previous search
   */
  isPreviousResults: boolean;
  /**
   * Suggestions that should be rendered for the user if no results are found
   */
  suggestions: Suggestion[];
  /**
   * Summary text of search progress
   */
  summary: string;
  /**
   * Additional details of search progress
   */
  summaryDetail?: string;
  /**
   * Whether a search is currently being executed
   */
  isLoading: boolean;
  /**
   * The previously used pattern type
   */
  previousPatternType?: PatternType;
}

const emptyState: SearchState = {
  results: [],
  isPreviousResults: false,
  suggestions: [],
  summary: "",
  summaryDetail: undefined,
  isLoading: false,
  previousPatternType: undefined,
};

/**
 * useSearch enables search capabilities.
 *
 * @param src Sourcegraph configuration
 * @param maxResults Configures the maximum number of results to send to state
 */
export function useSearch(src: Sourcegraph, maxResults: number) {
  const [state, setState] = useState<SearchState>(emptyState);
  const lastSearchRef = useRef<{ search: string; pattern: PatternType }>();
  const cancelRef = useRef<AbortController | null>(null);
  const { push } = useNavigation();

  async function search(searchText: string, pattern: PatternType) {
    // Do not execute empty search - simply reset state
    if (!searchText.trim()) {
      cancelRef.current?.abort(); // reset state, cancel any active search
      setState(emptyState);
      return;
    }

    // Do not repeat searches that are essentially the same
    if (
      (lastSearchRef.current?.search || "").trim() === searchText.trim() &&
      lastSearchRef.current?.pattern === pattern
    ) {
      return;
    }

    // We're starting a new search - cancel the previous one
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();

    // Reset state for new search
    setState((oldState) => {
      if (lastSearchRef.current?.search && searchText.startsWith(lastSearchRef.current?.search)) {
        return {
          ...emptyState,
          isLoading: true,
          // Preserve the previous results to avoid flickering
          results: oldState.results,
          isPreviousResults: true,
        };
      }
      return {
        ...emptyState,
        isLoading: true,
      };
    });

    // Search is starting - track current search as the last search.
    lastSearchRef.current = { search: searchText, pattern };

    try {
      // Update search history
      await SearchHistory.addSearch(src, searchText);

      // Do the search
      await performSearch(cancelRef.current, src, searchText, pattern, {
        onResults: (results) => {
          setState((oldState) => {
            // We're getting new results, so reset previous results
            if (oldState.isPreviousResults) {
              oldState.results = [];
            }
            // We should not render any more results.
            if (oldState.results.length > maxResults) {
              return oldState; // do nothing
            }
            const newResults = oldState.results.concat(results);
            return {
              ...oldState,
              isPreviousResults: false,
              results: newResults,
              summaryDetail: `${newResults.length} results shown`,
            };
          });
        },
        onSuggestions: (suggestions, pushToTop) => {
          setState((oldState) => ({
            ...oldState,
            suggestions: pushToTop
              ? suggestions.concat(oldState.suggestions)
              : oldState.suggestions.concat(suggestions),
          }));
        },
        onAlert: (alert) => {
          const toast = ExpandableToast(push, "Alert", alert.title, alert.description || "");
          switch (alert.kind) {
            case "smart-search-additional-results":
            case "smart-search-pure-results":
              toast.style = Toast.Style.Success;
          }
          toast.show();
        },
        onProgress: ({ durationMs, matchCount, skipped }) => {
          const duration = Duration.fromMillis(durationMs)
            .normalize()
            .shiftTo(durationMs > 1000 ? "seconds" : "milliseconds")
            .toHuman({ unitDisplay: "narrow" });

          const results =
            matchCount === 0 ? `${matchCount}` : `${Intl.NumberFormat().format(matchCount)}${skipped ? "+" : ""}`;

          setState((oldState) => {
            // If it's been a second or so and there's been no results, clear
            // the previous results as it's likely they are no longer relevant.
            if (oldState.isPreviousResults && durationMs > 1000) {
              oldState.results = [];
            }
            return {
              ...oldState,
              summary: `Found ${results} results in ${duration}`,
            };
          });
        },
        onDone: () => {
          setState((oldState) => {
            if (oldState.isPreviousResults) {
              return { ...oldState, results: [], isPreviousResults: false };
            }
            return oldState;
          });
        },
      });
    } catch (error) {
      ExpandableToast(push, "Unexpected error", "Search failed", String(error)).show();
      // Reset the search state
      setState((oldState) => ({ ...oldState, loading: false, results: [], isPreviousResults: false }));
    } finally {
      setState((oldState) => ({
        ...oldState,
        // Another search may be in-flight already.
        isLoading: !cancelRef.current?.signal.aborted,
      }));
    }
  }

  return {
    state: state,
    search: search,
  };
}
