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

export async function getSearchResults(
  searchText: string,
  token: string,
  signal: AbortSignal
): Promise<SearchResult[]> {
  const response = await fetch(`https://kagi.com/api/autosuggest?q=${encodeURIComponent(searchText)}`, {
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
  const decoder = new TextDecoder("iso-8859-1");
  const text = decoder.decode(buffer);
  const json = JSON.parse(text);

  const results: SearchResult[] = [
    {
      id: randomId(),
      query: searchText,
      description: searchText,
      url: `https://kagi.com/search?token=${token}&q=${encodeURIComponent(searchText)}`,
    },
  ];

  json[1].map((item: string, i: number) => {
    results[i + 1] = {
      id: randomId(),
      query: item,
      description: item,
      url: `https://kagi.com/search?token=${token}&q=${encodeURIComponent(item)}`,
    };
  });

  return results;
}
