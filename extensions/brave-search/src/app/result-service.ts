/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPreferenceValues, Icon, LocalStorage } from "@raycast/api";
import { nanoid } from "nanoid";
import { BraveResult, Preferences, SearchResult } from "./models";
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

  return JSON.parse(historyString);
}

export function getStaticResult(searchText: string): SearchResult[] {
  if (!searchText) {
    return [];
  }

  const result: SearchResult[] = [
    {
      id: nanoid(),
      query: searchText,
      description: `Search Brave for '${searchText}'`,
      url: `https://search.brave.com/search?q=${encodeURIComponent(searchText)}&source=raycast`,
    },
  ];

  return result;
}

export async function getAutoSearchResults(searchText: string, signal: any): Promise<SearchResult[]> {
  const response = await fetch(
    `https://search.brave.com/api/suggest?q=${encodeURIComponent(searchText)}&rich=true&source=raycast`,
    {
      method: "get",
      signal: signal,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  const results: SearchResult[] = [];

  const braveResults = (await response.json()) as any;
  braveResults[1].map((item: BraveResult) => {
    results.push({
      id: nanoid(),
      query: item.q,
      description: `Search Brave for '${item.q}'`,
      url: `https://search.brave.com/search?q=${encodeURIComponent(item.q)}&source=raycast`,
    });
  });

  return results;
}

export const getIcon = (item: SearchResult) => {
  if (item.isHistory) {
    return Icon.Clock;
  } else {
    return Icon.MagnifyingGlass;
  }
};
