import { usePromise } from "@raycast/utils";
import { useRef } from "react";
import { SEARCH, parseSuggestions } from "./constants";
import { isURL, normalizeURL } from "./url";
import type { Suggestion } from "./types";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// 4 remote + 1 always-on "Search Google" seed = 5 rows in the Search Suggestions section.
const MAX_API_SUGGESTIONS = 4;
const FETCH_TIMEOUT_MS = 3000;

interface SuggestionResult {
  query: string;
  suggestions: Suggestion[];
}

/**
 * Synchronous seed rows that always show "Open URL ↗" (if the query parses as
 * a URL) and "Search Google", so the user can always commit the current text
 * even if Google's suggestion API is offline / slow / blocked.
 */
function buildSeedSuggestions(searchText: string): Suggestion[] {
  if (!searchText.trim()) return [];
  const out: Suggestion[] = [];
  if (isURL(searchText)) {
    out.push({ id: "url-direct", query: searchText, url: normalizeURL(searchText), type: "url" });
  }
  out.push({
    id: "search-default",
    query: searchText,
    url: `${SEARCH.searchUrl}${encodeURIComponent(searchText)}`,
    type: "search",
  });
  return out;
}

/**
 * Google suggestion dropdown. Query text and results stay scoped to the
 * current command run; seed rows remain available if the request fails.
 */
export function useSuggestions(searchText: string) {
  const abortable = useRef<AbortController>(undefined);

  const { data, isLoading } = usePromise(
    async (text: string): Promise<SuggestionResult> => {
      const emptyResult = { query: text, suggestions: [] };
      if (!SEARCH.suggestionsUrl) return emptyResult;

      try {
        const timeoutSignal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
        const signal = abortable.current?.signal
          ? AbortSignal.any([abortable.current.signal, timeoutSignal])
          : timeoutSignal;
        const response = await fetch(`${SEARCH.suggestionsUrl}${encodeURIComponent(text)}`, {
          method: "GET",
          headers: { "User-Agent": UA, Accept: "*/*", "Accept-Language": "en-US,en;q=0.9" },
          signal,
        });
        if (!response.ok) return emptyResult;

        const json = JSON.parse(await response.text());
        const remote = parseSuggestions(json);
        const suggestions: Suggestion[] = [];

        for (let i = 0; i < remote.length && i < MAX_API_SUGGESTIONS; i++) {
          const s = remote[i];
          if (s.toLowerCase() === text.toLowerCase()) continue;
          suggestions.push({
            id: `suggestion-${i}`,
            query: s,
            url: `${SEARCH.searchUrl}${encodeURIComponent(s)}`,
            type: "search",
          });
        }
        return { query: text, suggestions };
      } catch (error) {
        if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
          return emptyResult;
        }
        console.error("[suggestions]", error);
        return emptyResult;
      }
    },
    [searchText],
    {
      execute: searchText.trim().length > 0,
      abortable,
    },
  );
  const remoteSuggestions = data?.query === searchText ? data.suggestions : [];
  return { data: [...buildSeedSuggestions(searchText), ...remoteSuggestions], isLoading };
}
