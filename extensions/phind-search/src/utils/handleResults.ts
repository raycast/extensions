import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { nanoid } from "nanoid";
import fetch from "node-fetch";
import iconv from "iconv-lite";
import { Preferences, SearchResult } from "./types";

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

export function getStaticResult(searchText: string, contextText: string): SearchResult[] {
  if (!searchText) {
    return [];
  }

  const result: SearchResult[] = [
    {
      id: nanoid(),
      query: searchText,
      description: `Search Phind for '${searchText}'`,
      url: `https://phind.com/search?q=${encodeURIComponent(searchText)}&c=${encodeURIComponent(contextText ?? "")}`,
    },
  ];

  return result;
}

export async function getAutoSearchResults(
  searchText: string,
  contextText: string,
  signal: AbortSignal
): Promise<SearchResult[]> {
  // use bing api to get auto suggestions
  const response = await fetch(`https://www.bing.com/asjson.aspx?query=${encodeURIComponent(searchText)}`, {
    method: "get",
    signal: signal,
    headers: {
      "Content-Type": "text/plain; charset=UTF-8",
    },
  });

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  const buffer = await response.arrayBuffer();
  const text = iconv.decode(Buffer.from(buffer), "utf-8");
  const json = JSON.parse(text);

  const results: SearchResult[] = [];

  json[1].map((item: string) => {
    results.push({
      id: nanoid(),
      query: item,
      description: `Search Phind for '${item}'`,
      url: `https://phind.com/search?q=${encodeURIComponent(item)}&c=${encodeURIComponent(contextText ?? "")}`,
    });
  });

  return results;
}
