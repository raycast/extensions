import { Cache } from "@raycast/api";
import { CacheData, SearchResult } from "../@types/global";
import { getSiteUrl } from "../constants";
import { parseSearchResult } from "../shared/links";

const cache = new Cache();
const LAST_SEARCH_KEY = "lastSearch";
const MAX_AGE_MS = 60 * 60 * 1000;

export const cacheLastSearch = (link: string, searchResult: SearchResult) => {
  cache.set(
    LAST_SEARCH_KEY,
    JSON.stringify({ link: link.trim(), searchResult, siteUrl: getSiteUrl(), savedAt: Date.now() }),
  );
};

export const getLastSearch = (): CacheData | undefined => {
  const lastSearch = cache.get(LAST_SEARCH_KEY);
  if (!lastSearch) return;

  try {
    const data: unknown = JSON.parse(lastSearch);
    if (
      typeof data !== "object" ||
      data === null ||
      !("link" in data) ||
      typeof data.link !== "string" ||
      !("siteUrl" in data) ||
      data.siteUrl !== getSiteUrl() ||
      !("savedAt" in data) ||
      typeof data.savedAt !== "number" ||
      Date.now() - data.savedAt > MAX_AGE_MS ||
      !("searchResult" in data)
    )
      return;
    return { link: data.link, searchResult: parseSearchResult(data.searchResult) };
  } catch {
    cache.remove(LAST_SEARCH_KEY);
    return;
  }
};
