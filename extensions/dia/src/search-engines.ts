import { getPreferenceValues } from "@raycast/api";

export type SearchEngineId = "google" | "kagi" | "duckduckgo" | "brave" | "bing";

export type SearchEngine = {
  id: SearchEngineId;
  name: string;
  searchUrl: string;
};

const SEARCH_ENGINES: Record<SearchEngineId, SearchEngine> = {
  google: { id: "google", name: "Google", searchUrl: "https://www.google.com/search?q=" },
  kagi: { id: "kagi", name: "Kagi", searchUrl: "https://kagi.com/search?q=" },
  duckduckgo: { id: "duckduckgo", name: "DuckDuckGo", searchUrl: "https://duckduckgo.com/?q=" },
  brave: { id: "brave", name: "Brave Search", searchUrl: "https://search.brave.com/search?q=" },
  bing: { id: "bing", name: "Bing", searchUrl: "https://www.bing.com/search?q=" },
};

export function getSearchEngine() {
  const { searchEngine = "google" } = getPreferenceValues<Preferences.Search>();
  return SEARCH_ENGINES[searchEngine] ?? SEARCH_ENGINES.google;
}

export function getSearchUrl(query: string, searchEngine = getSearchEngine()) {
  return `${searchEngine.searchUrl}${encodeURIComponent(query)}`;
}

export function getSearchActionTitle(searchEngine = getSearchEngine()) {
  return `Search ${searchEngine.name}`;
}
