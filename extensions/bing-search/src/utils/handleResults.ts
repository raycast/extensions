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
      description: `Search Bing for '${searchText}'`,
      url: `https://www.bing.com/search?q=${encodeURIComponent(searchText)}`,
    },
  ];

  return result;
}

export async function getAutoSearchResults(searchText: string, signal: any): Promise<SearchResult[]> {
  const response = await fetch(`https://www.bing.com/asjson.aspx?query=${encodeURIComponent(searchText)}`, {
    method: "get",
    signal,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
    },
  });

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  const text = await response.text();
  const json = JSON.parse(text);

  const results: SearchResult[] = [];

  json[1].map((item: string, i: number) => {
    results.push({
      id: nanoid(),
      query: item,
      description: `Search Bing for '${item}'`,
      url: `https://www.bing.com/search?q=${encodeURIComponent(item)}`,
    });
  });

  return results;
}
