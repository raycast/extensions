import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { nanoid } from "nanoid";
import { Preferences, SearchResult } from "./types";
import fetch from "node-fetch";
import iconv from "iconv-lite";

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
      description: `Search Baidu for '${searchText}'`,
      url: `http://www.baidu.com/s?wd=${encodeURIComponent(searchText)}`,
    },
  ];

  return result;
}

export async function getAutoSearchResults(searchText: string, signal: any): Promise<SearchResult[]> {
  const response = await fetch(`https://suggestion.baidu.com/su?cb=&json=1&wd=${encodeURIComponent(searchText)}`, {
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
  const text = iconv.decode(Buffer.from(buffer), "gbk");
  const json = JSON.parse(text.slice(1, -2));

  const results: SearchResult[] = [];

  json["s"].map((item: string, i: number) => {
    results.push({
      id: nanoid(),
      query: item,
      description: `Search Baidu for '${item}'`,
      url: `http://www.baidu.com/s?wd=${encodeURIComponent(item)}`,
    });
  });

  return results;
}
