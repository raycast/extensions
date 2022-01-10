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
    `http://suggestqueries.google.com/complete/search?hl=en-us&output=chrome&q=${encodeURIComponent(searchText)}`,
    {
      method: "get",
      signal: signal,
    }
  );

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  const json: any = await response.json();

  const results: SearchResult[] = [
    {
      id: randomId(),
      query: searchText,
      description: `Search Google for '${searchText}'`,
      url: `https://www.google.com/search?q=${encodeURIComponent(searchText)}`,
    },
  ];

  json[1].map((item: string, i: number) => {
    const type = json[4]["google:suggesttype"][i];
    const description = json[2][i];

    if (type === "NAVIGATION") {
      results[i + 1] = {
        id: randomId(),
        query: description.length > 0 ? description : item,
        description: `Open URL for '${item}'`,
        url: item,
        isNavigation: true,
      };
    } else if (type === "QUERY") {
      results[i + 1] = {
        id: randomId(),
        query: item,
        description: `Search Google for '${item}'`,
        url: `https://www.google.com/search?q=${encodeURIComponent(item)}`,
      };
    }
  });

  return results;
}
