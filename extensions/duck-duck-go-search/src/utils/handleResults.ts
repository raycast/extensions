import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { nanoid } from "nanoid";
import { Preferences, SearchResult } from "./types";
import fetch from "node-fetch";

export async function getSearchHistory(): Promise<SearchResult[]> {
  const { rememberSearchHistory } = getPreferenceValues<Preferences>();

  if (!rememberSearchHistory) {
    return [];
  }

  const historyString = (await LocalStorage.getItem("history")) as string;

  if (historyString === undefined) {
    return [];
  }

  const items: SearchResult[] = JSON.parse(historyString);
  return items;
}

export function getStaticResult(searchText: string): SearchResult[] {
  if (!searchText) {
    return [];
  }

  const result: SearchResult[] = [
    {
      id: nanoid(),
      query: searchText,
      url: `https://www.google.com/search?q=${encodeURIComponent(searchText)}`,
    },
  ];

  return result;
}

export async function getAutoSearchResults(searchText: string, signal: any): Promise<SearchResult[]> {
  const response = await fetch(`https://duckduckgo.com/ac/?kl=wt-wt&q=${encodeURIComponent(searchText)}`, {
    method: "get",
    signal: signal,
    headers: {
      "Content-Type": "text/plain; charset=UTF-8",
    },
  });

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  const suggestions = (await response.json()) as { phrase: string }[];
  const results: SearchResult[] = suggestions.map((suggestion) => ({
    id: nanoid(),
    query: suggestion.phrase,
    url: `https://duckduckgo.com/?kl=wt-wt&q=${encodeURIComponent(suggestion.phrase)}`,
  }));

  return results;
}
