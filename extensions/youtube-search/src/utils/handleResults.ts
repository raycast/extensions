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
      description: `Search YouTube for '${searchText}'`,
      url: `https://www.youtube.com/search?q=${encodeURIComponent(searchText)}`,
    },
  ];

  return result;
}

export async function getAutoSearchResults(searchText: string, signal: any): Promise<SearchResult[]> {
  const response = await fetch(
    `https://suggestqueries.google.com/complete/search?hl=en-us&ds=yt&output=chrome&q=${encodeURIComponent(
      searchText
    )}`,
    {
      method: "get",
      signal: signal,
      headers: {
        "Content-Type": "text/plain; charset=UTF-8",
      },
    }
  );

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  const buffer = await response.arrayBuffer();
  const text = iconv.decode(Buffer.from(buffer), "iso-8859-1");
  const json = JSON.parse(text);

  const results: SearchResult[] = [];

  json[1].map((item: string, i: number) => {
    const type = json[4]["google:suggesttype"][i];
    const description = json[2][i];

    if (type === "NAVIGATION") {
      results.push({
        id: nanoid(),
        query: description.length > 0 ? description : item,
        description: `Open URL for '${item}'`,
        url: item,
        isNavigation: true,
      });
    } else if (type === "QUERY") {
      results.push({
        id: nanoid(),
        query: item,
        description: `Search YouTube for '${item}'`,
        url: `https://www.youtube.com/search?q=${encodeURIComponent(item)}`,
      });
    }
  });

  return results;
}
