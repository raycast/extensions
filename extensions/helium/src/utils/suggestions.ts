import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { isURL, normalizeURL } from "./url";

export interface Suggestion {
  id: string;
  query: string;
  url: string;
  type: "search" | "url";
}

// Type for search engine suggestion API responses
type SuggestionApiResponse = unknown;

interface SearchEngineConfig {
  name: string;
  searchUrl: string;
  suggestionsUrl?: string;
  suggestionsParser?: (json: SuggestionApiResponse) => string[];
}

const SEARCH_ENGINES: Record<string, SearchEngineConfig> = {
  google: {
    name: "Google",
    searchUrl: "https://www.google.com/search?q=",
    suggestionsUrl: "https://suggestqueries.google.com/complete/search?hl=en-us&output=chrome&q=",
    suggestionsParser: (json: SuggestionApiResponse) => {
      // Google returns: [query, [suggestions], [descriptions], [], metadata]
      if (Array.isArray(json) && json.length >= 2 && Array.isArray(json[1])) {
        return json[1] as string[];
      }
      return [];
    },
  },
  duckduckgo: {
    name: "DuckDuckGo",
    searchUrl: "https://duckduckgo.com/?q=",
    suggestionsUrl: "https://duckduckgo.com/ac/?q=",
    suggestionsParser: (json: SuggestionApiResponse) => {
      // DuckDuckGo returns: [{"phrase": "suggestion"}]
      if (Array.isArray(json)) {
        return json.map((item: { phrase?: string }) => item.phrase).filter((phrase): phrase is string => !!phrase);
      }
      return [];
    },
  },
  bing: {
    name: "Bing",
    searchUrl: "https://www.bing.com/search?q=",
  },
  yahoo: {
    name: "Yahoo",
    searchUrl: "https://search.yahoo.com/search?p=",
  },
  ecosia: {
    name: "Ecosia",
    searchUrl: "https://www.ecosia.org/search?q=",
    suggestionsUrl: "https://ac.ecosia.org/?type=list&q=",
    suggestionsParser: (json: SuggestionApiResponse) => {
      // Ecosia returns: [query, [suggestions]]
      if (Array.isArray(json) && json.length >= 2 && Array.isArray(json[1])) {
        return json[1] as string[];
      }
      return [];
    },
  },
};

/**
 * Get the current search engine configuration
 */
function getSearchEngineConfig(): SearchEngineConfig {
  const preferences = getPreferenceValues<Preferences>();
  const engineKey = preferences.searchEngine || "google";
  return SEARCH_ENGINES[engineKey] || SEARCH_ENGINES.google;
}

/**
 * Fetch suggestions from the search engine
 */
async function fetchSuggestions(searchText: string): Promise<Suggestion[]> {
  if (!searchText || searchText.trim().length === 0) {
    return [];
  }

  const config = getSearchEngineConfig();
  const results: Suggestion[] = [];

  // Always add the "Open URL" suggestion if it's a valid URL
  if (isURL(searchText)) {
    const normalizedUrl = normalizeURL(searchText);
    results.push({
      id: "url-direct",
      query: searchText,
      url: normalizedUrl,
      type: "url",
    });
  }

  // Always add default search suggestion with constructed URL
  results.push({
    id: "search-default",
    query: searchText,
    url: `${config.searchUrl}${encodeURIComponent(searchText)}`,
    type: "search",
  });

  // Determine which suggestions API to use
  // Use the search engine's own API if available, otherwise fall back to DuckDuckGo (more reliable than Google)
  const suggestionsUrl = config.suggestionsUrl || SEARCH_ENGINES.duckduckgo.suggestionsUrl;
  const suggestionsParser = config.suggestionsParser || SEARCH_ENGINES.duckduckgo.suggestionsParser;

  // Fetch suggestions from API (always available now with DuckDuckGo fallback)
  if (suggestionsUrl && suggestionsParser) {
    try {
      const url = `${suggestionsUrl}${encodeURIComponent(searchText)}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "*/*",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });

      if (response.ok) {
        const text = await response.text();

        const json = JSON.parse(text);

        const suggestions = suggestionsParser(json);

        // Add parsed suggestions using the selected search engine's URL
        suggestions.slice(0, 8).forEach((suggestion: string, index: number) => {
          // Skip if it's the same as the search text
          if (suggestion.toLowerCase() === searchText.toLowerCase()) {
            return;
          }

          results.push({
            id: `suggestion-${index}`,
            query: suggestion,
            url: `${config.searchUrl}${encodeURIComponent(suggestion)}`,
            type: "search",
          });
        });
      } else {
        console.error(`[Suggestions] Response not ok: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      // Silently fail - we still have the default search suggestion
      console.error("[Suggestions] Failed to fetch suggestions:", error);
    }
  }

  return results;
}

/**
 * Hook to get search suggestions
 */
export function useSuggestions(searchText: string) {
  const { data, isLoading } = useCachedPromise(
    async (text: string) => {
      return await fetchSuggestions(text);
    },
    [searchText],
    {
      keepPreviousData: false,
      execute: searchText.trim().length > 0,
    },
  );

  return {
    data: data || [],
    isLoading,
  };
}

/**
 * Get the search engine name for display
 */
export function getSearchEngineName(): string {
  const config = getSearchEngineConfig();
  return config.name;
}
