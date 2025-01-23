import { getLocalStorageItem, randomId } from "@raycast/api";
import { SearchResult } from "./types";
import fetch from "node-fetch";

export async function getSearchHistory(): Promise<SearchResult[]> {
  const historyString = (await getLocalStorageItem("history")) as string;

  if (historyString === undefined) {
    return [];
  }

  const items: SearchResult[] = JSON.parse(historyString);
  return items;
}

export async function getSearchResults(searchText: string, signal: AbortSignal): Promise<SearchResult[]> {
  const response = await fetch(
    `https://www.diki.pl/dictionary/autocomplete?q=${encodeURIComponent(searchText)}&langpair=en%3A%3Apl`,
    {
      method: "get",
      signal: signal,
      headers: {
        "Content-Type": "text/plain; charset=UTF-8",
      },
    },
  );

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  const suggestions = (await response.json()) as string[];
  const results: SearchResult[] = [
    {
      id: randomId(),
      query: searchText,
      description: `Translate '${searchText}' with Diki`,
      url: `https://www.diki.pl/?q=${encodeURIComponent(searchText)}`,
    },
    ...suggestions.map((suggestion) => ({
      id: randomId(),
      query: suggestion,
      description: `Translate '${suggestion}' with Diki`,
      url: `https://www.diki.pl/?q=${encodeURIComponent(suggestion)}`,
    })),
  ];

  return results;
}
