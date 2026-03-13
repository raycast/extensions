// src/utils/handleResults.ts
import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { SearchResult } from "./types";
import { TextDecoder } from "node:util";
import { nanoid } from "nanoid";

export async function getSearchHistory(): Promise<SearchResult[]> {
  const historyString = await LocalStorage.getItem<string>("history");

  if (historyString === undefined) {
    return [];
  }

  const items: SearchResult[] = JSON.parse(historyString);
  return items;
}

export async function getSearchResults(
  searchText: string,
  token: string,
  signal: AbortSignal,
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

  const firstResult = {
    id: nanoid(),
    query: searchText,
    description: `Search Kagi for '${searchText}'`,
    url: `https://kagi.com/search?token=${token}&q=${encodeURIComponent(searchText)}`,
  };

  // Apply description changes based on conditions
  if (searchText.includes("!")) {
    firstResult.description = "Use a Kagi bang with: " + searchText;
  } else if (searchText.includes("?") && getPreferenceValues<ExtensionPreferences>()["fastGptShortcut"]) {
    firstResult.description = "Ask FastGPT: " + searchText;
  }

  const results: SearchResult[] = [firstResult];

  json[1].forEach((item: string, i: number) => {
    const result = {
      id: nanoid(),
      query: item,
      description: `Search Kagi for '${item}'`,
      url: `https://kagi.com/search?token=${token}&q=${encodeURIComponent(item)}`,
    };
    // Apply the same conditional logic to the other results
    if (result.query.includes("!")) {
      result.description = "Use a Kagi bang with: " + item;
    } else if (result.query.includes("?") && getPreferenceValues<ExtensionPreferences>()["fastGptShortcut"]) {
      result.description = "Ask FastGPT: " + item;
    }
    results[i + 1] = result;
  });

  return results;
}
