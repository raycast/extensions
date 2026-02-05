import { open, getPreferenceValues } from "@raycast/api";

const SEARCH_ENGINES: Record<string, string> = {
  google: "https://www.google.com/search?q=",
  duckduckgo: "https://duckduckgo.com/?q=",
  bing: "https://www.bing.com/search?q=",
  brave: "https://search.brave.com/search?q=",
  ecosia: "https://www.ecosia.org/search?q=",
};

/**
 * Search the web using preferred search engine
 */
export async function searchWeb(query: string): Promise<void> {
  const { preferredSearchEngine } = getPreferenceValues<Preferences>();
  const baseUrl = SEARCH_ENGINES[preferredSearchEngine];
  const encodedQuery = encodeURIComponent(query);
  await open(`${baseUrl}${encodedQuery}`);
}

/**
 * Search Wikipedia
 */
export async function searchWikipedia(query: string): Promise<void> {
  const encodedQuery = encodeURIComponent(query);
  await open(`https://en.wikipedia.org/wiki/Special:Search?search=${encodedQuery}`);
}
