import { Cache } from "@raycast/api";

import { CacheData, SpotifyContent } from "../@types/global";

const cache = new Cache();

const LAST_SEARCH_KEY = "lastSearch";

export const cacheLastSearch = (spotifyLink: string, spotifyContent: SpotifyContent) => {
  const data = JSON.stringify({
    spotifyLink,
    spotifyContent,
  });

  cache.set(LAST_SEARCH_KEY, data);
};

export const getLastSearch = (): CacheData | undefined => {
  const lastSearch = cache.get(LAST_SEARCH_KEY);
  if (lastSearch) {
    return JSON.parse(lastSearch);
  }
};
