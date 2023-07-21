import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { nanoid } from "nanoid";
import { autoCompleteItem, Preferences, SearchResult } from "./types";
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
      description: `Search Naver for '${searchText}'`,
      url: `https://search.naver.com/search.naver?query=${encodeURIComponent(searchText)}`,
    },
  ];

  return result;
}

export async function getAutoSearchResults(searchText: string, signal: AbortSignal): Promise<SearchResult[]> {
  const response = await fetch(
    `https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(
      searchText
    )}&con=1&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100`,
    {
      method: "get",
      signal: signal,
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
      },
    }
  );

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  const buffer = await response.arrayBuffer();
  const text = iconv.decode(Buffer.from(buffer), "utf-8");
  const json = JSON.parse(text);

  const results: SearchResult[] = [];

  json["items"][0].map((item: autoCompleteItem, _i: number) => {
    const query: string = item[0];
    results.push({
      id: nanoid(),
      query: query,
      description: `Search Naver for '${query}'`,
      url: `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}`,
    });
  });

  return results;
}
