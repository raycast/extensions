import { useEffect } from "react";
import { useCachedPromise } from "@raycast/utils";
import { decode } from "iconv-lite";
import { nanoid } from "nanoid";
import { fetch } from "cross-fetch";
import { Suggestion, SearchConfigs } from "./types";
import { searchArcPreferences } from "./preferences";

const config: SearchConfigs = {
  google: {
    search: "https://www.google.com/search?q=",
    suggestions: "https://suggestqueries.google.com/complete/search?hl=en-us&output=chrome&q=",
    suggestionParser: (json: any, suggestions: Suggestion[]) => {
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
    suggestionParser: (json: any, suggestions: Suggestion[]) => {
      json[1].map((item: string, i: number) => {
        suggestions.push({
          id: nanoid(),
          query: item,
          url: `https://www.ecosia.org/search?q=${encodeURIComponent(item)}`,
        });
      });
    },
  },
};

async function parseResponse(response: Response) {
  if (!response.ok) {
    throw new Error(`${response.statusText} (HTTP ${response.status})`);
  }

  const buffer = await response.arrayBuffer();
  const text = decode(Buffer.from(buffer), "iso-8859-1");
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
  return [
    {
      id: nanoid(),
      query: searchText,
      url: `${config[searchArcPreferences.engine].search}${encodeURIComponent(searchText)}`,
    },
  ];
}

export function useSuggestions(searchText: string) {
  const { data, isLoading, revalidate } = useCachedPromise<() => Promise<Suggestion[]>>(
    async () => {
      const suggestionUrl = config[searchArcPreferences.engine].suggestions;
      if (!suggestionUrl) {
        return getDefaultSuggestions(searchText);
      }

      const response = await fetch(`${suggestionUrl}${encodeURIComponent(searchText)}`, {
        headers: {
          "Content-Type": "text/plain; charset=UTF-8",
        },
      });
      const parsed = await parseResponse(response);

      return [...getDefaultSuggestions(searchText), ...parsed];
    },
    [],
    { keepPreviousData: true }
  );

  useEffect(() => {
    revalidate();
  }, [searchText]);

  return { data, isLoading };
}
