import { Cache } from "@raycast/api";

import { CacheData, SearchResult } from "../@types/global";

const cache = new Cache();

const LAST_SEARCH_KEY = "lastSearch";

export const cacheLastSearch = (link: string, searchResult: SearchResult) => {
  const data = JSON.stringify({
    link,
    searchResult,
  });

  cache.set(LAST_SEARCH_KEY, data);
};

export const getLastSearch = (): CacheData | undefined => {
  const lastSearch = cache.get(LAST_SEARCH_KEY);

  if (!lastSearch) {
    return;
  }

  return JSON.parse(lastSearch);
};

export const cleanLastSearch = () => {
  cache.remove(LAST_SEARCH_KEY);
};
