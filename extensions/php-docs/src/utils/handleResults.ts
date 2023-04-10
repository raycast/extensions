import { getLocalStorageItem } from "@raycast/api";
import { SearchResult } from "./types";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

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
    // `https://www.php.net/search.php?pattern=${encodeURIComponent(searchText)}`,
    `https://www.php.net/manual-lookup.php?pattern=${encodeURIComponent(searchText)}`,
    {
      method: "get",
      headers: {
        "Content-Type": "text/plain; charset=UTF-8",
      },
    }
  );

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  const body = await response.text();
  const parser = cheerio.load(body, null, false);

  const results: SearchResult[] = [
    {
      id: Math.random().toString(36),
      description: response.redirected ? `open documentation for '${searchText}'` : `Search PHP for '${searchText}'`,
      url: response.redirected
        ? response.url
        : `https://www.php.net/search.php?pattern=${encodeURIComponent(searchText)}`,
    },
  ];

  parser("ul#quickref_functions")
    .find("li")
    .map((i, item) => {
      const url = parser(item).find("a").attr("href");
      const description = parser(item).text();

      results.push({
        id: Math.random().toString(36),
        description: `${description}`,
        url: `https://www.php.net${url}`,
      });
    });

  return results;
}
