import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { nanoid } from "nanoid";
import { getSearchUrl, normalizeNavigationUrl } from "./resultUtils";
import { HISTORY_KEY, SearchResult, SuggestResponse } from "./types";

export async function getSearchHistory(): Promise<SearchResult[]> {
  const { rememberSearchHistory } = getPreferenceValues<Preferences>();

  if (!rememberSearchHistory) {
    return [];
  }

  const historyString = await LocalStorage.getItem(HISTORY_KEY);

  if (!historyString || typeof historyString !== "string") {
    return [];
  }

  try {
    const items: SearchResult[] = JSON.parse(historyString);
    if (!Array.isArray(items)) {
      return [];
    }

    const seenUrls = new Set<string>();
    // Older "Search Selected Text" entries were stored without the flag and untrimmed;
    // rebuild them so they match the same search typed in the list.
    return items
      .filter((item) => item && (item.isNavigation || item.query?.trim()))
      .map((item) =>
        item.isNavigation
          ? { ...item, isHistory: true }
          : { ...getStaticResult(item.query.trim())[0], id: item.id, isHistory: true },
      )
      .filter((item) => !seenUrls.has(item.url) && seenUrls.add(item.url));
  } catch (error) {
    console.error("Could not parse search history", error);
    return [];
  }
}

export function getStaticResult(searchText: string): SearchResult[] {
  if (!searchText?.trim()) {
    return [];
  }

  const result: SearchResult[] = [
    {
      id: nanoid(),
      query: searchText,
      description: `Search Google for '${searchText}'`,
      url: getSearchUrl(searchText),
    },
  ];

  return result;
}

export async function getAutoSearchResults(searchText: string, signal: AbortSignal): Promise<SearchResult[]> {
  // `oe=utf-8` makes Google answer in UTF-8; without it the body is ISO-8859-1.
  const response = await fetch(
    `https://suggestqueries.google.com/complete/search?hl=en-us&output=chrome&ie=utf-8&oe=utf-8&q=${encodeURIComponent(searchText)}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error(`Google suggestions returned ${response.status} ${response.statusText}`);
  }

  let json: SuggestResponse;
  try {
    json = (await response.json()) as SuggestResponse;
  } catch (error) {
    throw new Error(`Failed to parse suggestions response: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!Array.isArray(json) || !Array.isArray(json[1])) {
    return [];
  }

  const suggestions = json[1] ?? [];
  const descriptions = json[2] ?? [];
  const types = json[4]?.["google:suggesttype"] ?? [];

  const results: SearchResult[] = [];

  suggestions.forEach((item, i) => {
    if (typeof item !== "string") {
      return;
    }
    const type = types[i];
    const description = descriptions[i] ?? "";

    const safeNavUrl = type === "NAVIGATION" ? normalizeNavigationUrl(item) : null;

    if (safeNavUrl) {
      results.push({
        id: nanoid(),
        query: item,
        description: description || "Open URL",
        url: safeNavUrl,
        isNavigation: true,
      });
    } else {
      results.push({
        id: nanoid(),
        query: item,
        description: `Search Google for '${item}'`,
        url: getSearchUrl(item),
      });
    }
  });

  return results;
}
