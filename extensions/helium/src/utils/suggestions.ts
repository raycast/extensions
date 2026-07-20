import { useCachedPromise } from "@raycast/utils";
import type { Suggestion } from "../types";
import { resolveHeliumBang } from "./bangs";
import { getHeliumSearchEngine } from "./helium-profile";
import {
  buildSearchUrl,
  FALLBACK_SUGGESTION_CONFIG,
  getSuggestionSourceConfig,
  searchEngineToConfig,
  type SearchEngineConfig,
} from "./suggestion-helpers";
import { isURL, normalizeURL } from "./url";

/**
 * Get the current search engine configuration
 */
async function getSearchEngineConfig(): Promise<SearchEngineConfig> {
  const engine = await getHeliumSearchEngine();
  return searchEngineToConfig(engine);
}

/**
 * Fetch suggestions from the search engine
 */
async function fetchSuggestions(searchText: string): Promise<Suggestion[]> {
  if (!searchText || searchText.trim().length === 0) {
    return [];
  }

  const config = await getSearchEngineConfig();
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

  const resolvedBang = await resolveHeliumBang(searchText);
  if (resolvedBang) {
    results.push({
      id: `bang-${resolvedBang.trigger}`,
      query: searchText,
      url: resolvedBang.url,
      type: "bang",
      providerName: resolvedBang.name,
    });
  }

  // Always add default search suggestion with constructed URL
  results.push({
    id: "search-default",
    query: searchText,
    url: buildSearchUrl(config.searchUrl, searchText),
    type: "search",
    providerName: config.name,
  });

  // Determine which suggestions API to use
  // Use the search engine's own API if available, otherwise fall back to DuckDuckGo (more reliable than Google)
  const suggestionSourceConfig = getSuggestionSourceConfig(config);
  const suggestionsUrl = suggestionSourceConfig.suggestionsUrl || FALLBACK_SUGGESTION_CONFIG.suggestionsUrl;
  const suggestionsParser = suggestionSourceConfig.suggestionsParser || FALLBACK_SUGGESTION_CONFIG.suggestionsParser;

  // Fetch suggestions from API (always available now with DuckDuckGo fallback)
  if (suggestionsUrl && suggestionsParser) {
    try {
      const url = buildSearchUrl(suggestionsUrl, searchText);

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
            url: buildSearchUrl(config.searchUrl, suggestion),
            type: "search",
            providerName: config.name,
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
  return "Helium Search";
}
