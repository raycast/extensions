import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { nanoid } from "nanoid";
import { SearchResult } from "./types";

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
  const seenUrls = new Set<string>();
  // Older "Search Selected Text" entries were stored without the flag and untrimmed;
  // rebuild them so they match the same search typed in the list.
  return items
    .filter((item) => item.isNavigation || item.query?.trim())
    .map((item) =>
      item.isNavigation
        ? { ...item, isHistory: true }
        : { ...getStaticResult(item.query.trim())[0], id: item.id, isHistory: true },
    )
    .filter((item) => !seenUrls.has(item.url) && seenUrls.add(item.url));
}

export function getStaticResult(searchText: string): SearchResult[] {
  if (!searchText) {
    return [];
  }

  const result: SearchResult[] = [
    {
      id: nanoid(),
      query: searchText,
      description: `Search Google for '${searchText}'`,
      url: `https://www.google.com/search?q=${encodeURIComponent(searchText)}`,
    },
  ];

  return result;
}

// [query, suggestions, descriptions, unused, { "google:suggesttype": types, ... }]
type SuggestResponse = [string, string[]?, string[]?, unknown?, { "google:suggesttype"?: string[] }?];

export async function getAutoSearchResults(searchText: string, signal: AbortSignal): Promise<SearchResult[]> {
  // `oe=utf-8` makes Google answer in UTF-8; without it the body is ISO-8859-1.
  const response = await fetch(
    `https://suggestqueries.google.com/complete/search?hl=en-us&output=chrome&ie=utf-8&oe=utf-8&q=${encodeURIComponent(searchText)}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error(`Google suggestions returned ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as SuggestResponse;
  const suggestions = json[1] ?? [];
  const descriptions = json[2] ?? [];
  const types = json[4]?.["google:suggesttype"] ?? [];

  const results: SearchResult[] = [];

  suggestions.forEach((item, i) => {
    const type = types[i];
    const description = descriptions[i] ?? "";

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
        description: `Search Google for '${item}'`,
        url: `https://www.google.com/search?q=${encodeURIComponent(item)}`,
      });
    }
  });

  return results;
}
