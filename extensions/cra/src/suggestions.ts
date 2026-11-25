import { useCachedPromise } from "@raycast/utils";
import { decode } from "iconv-lite";
import { nanoid } from "nanoid";
import { useRef } from "react";
import { searchArcPreferences } from "./preferences";
import {
  EcosiaSuggestionParser,
  GoogleSuggestionParser,
  KagiSuggestionParser,
  SearchConfigs,
  Suggestion,
} from "./types";
import { isURL } from "./utils";

const config: SearchConfigs = {
  google: {
    search: "https://www.google.com/search?q=",
    suggestions: "https://suggestqueries.google.com/complete/search?hl=en-us&output=chrome&q=",
    suggestionParser: (json: GoogleSuggestionParser, suggestions: Suggestion[]) => {
      json[1].map((item: string, i: number) => {
        const type = json[4]["google:suggesttype"][i];
        const description = json[2][i];

        if (type === "NAVIGATION") {
          suggestions.push({
            id: nanoid(),
            query: description || item,
            url: item,
          });
        } else if (type === "QUERY") {
          suggestions.push({
            id: nanoid(),
            query: item,
            url: `https://www.google.com/search?q=${encodeURIComponent(item)}`,
          });
        } else {
          console.warn("Unknown suggestion type", type, item, description);
        }
      });
    },
  },
  duckduckgo: {
    search: "https://www.duckduckgo.com?q=",
    suggestions: null, //Note: https://stackoverflow.com/questions/37012469/duckduckgo-api-getting-search-results
    suggestionParser: null,
  },
  bing: {
    search: "https://www.bing.com/search?q=",
    suggestions: null, //Note: Behind an API
    suggestionParser: null,
  },
  yahoo: {
    search: "https://search.yahoo.com/search?p=",
    suggestions: null, //Note: Unknown
    suggestionParser: null,
  },
  ecosia: {
    search: "https://www.ecosia.org/search?q=",
    suggestions: "https://ac.ecosia.org?type=list&q=",
    suggestionParser: (json: EcosiaSuggestionParser, suggestions: Suggestion[]) => {
      json[1].map((item: string) => {
        suggestions.push({
          id: nanoid(),
          query: item,
          url: `https://www.ecosia.org/search?q=${encodeURIComponent(item)}`,
        });
      });
    },
  },
  kagi: {
    search: "https://kagi.com/search?q=",
    suggestions: "https://kagi.com/api/autosuggest?q=",
    suggestionParser: (json: KagiSuggestionParser, suggestions: Suggestion[]) => {
      json[1].map((item: string) => {
        suggestions.push({
          id: nanoid(),
          query: item,
          url: `https://kagi.com/search?q=${encodeURIComponent(item)}`,
        });
      });
    },
  },
  unduck: {
    search: "https://unduck.link?q=",
    suggestions: null,
    suggestionParser: null,
  },
};

async function parseResponse(response: Response) {
  if (!response.ok) {
    throw new Error(`${response.statusText} (HTTP ${response.status})`);
  }

  const buffer = await response.arrayBuffer();
  const text = decode(Buffer.from(buffer), "iso-8859-1");

  if (!text) return [];
  const json = JSON.parse(text);

  const suggestions: Suggestion[] = [];
  const { suggestionParser } = config[searchArcPreferences.engine];
  if (suggestionParser) {
    suggestionParser(json, suggestions);
  }

  return suggestions;
}

function getDefaultSuggestions(searchText?: string): Suggestion[] {
  if (!searchText) {
    return [];
  }
  const openUrl = isURL(searchText)
    ? [
        {
          id: nanoid(),
          query: `Open URL ${searchText}`,
          url: searchText,
        },
      ]
    : [];
  return [
    ...openUrl,
    {
      id: nanoid(),
      query: searchText,
      url: `${config[searchArcPreferences.engine].search}${encodeURIComponent(searchText)}`,
    },
  ];
}

export function useSuggestions(searchText: string) {
  const abortable = useRef<AbortController>(null);
  const text = searchText.trim();

  // Nothing is requested for an empty search bar, and a new query cancels the previous request.
  const { data, isLoading } = useCachedPromise(
    async (query: string) => {
      const suggestionUrl = config[searchArcPreferences.engine].suggestions;
      if (!suggestionUrl) {
        return getDefaultSuggestions(query);
      }

      const response = await fetch(`${suggestionUrl}${encodeURIComponent(query)}`, {
        headers: {
          "Content-Type": "text/plain; charset=UTF-8",
        },
        signal: abortable.current?.signal,
      });
      const parsed = await parseResponse(response);

      return [...getDefaultSuggestions(query), ...parsed];
    },
    [text],
    { keepPreviousData: true, execute: text.length > 0 && searchArcPreferences.showSuggestions, abortable },
  );

  return { data: text ? data : [], isLoading };
}
