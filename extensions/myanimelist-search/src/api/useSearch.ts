import { Cache, getPreferenceValues } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

import { type ExtendedAnime, fetchAnimes, fetchSuggestions, getAnimeWatchlist } from "./api";
import { isSignedIn } from "./oauth";
import { ViewType } from "../types";

type SearchProps = {
  q: string;
  debounce?: number;
};

type Preferences = {
  view?: ViewType;
  hide_nsfw?: boolean;
};

type CacheItem = {
  suggestions: ExtendedAnime[];
  timestamp: number;
};

const cache = new Cache();
function storeSuggestions(suggestions: ExtendedAnime[]) {
  cache.set("suggestions", JSON.stringify({ suggestions, timestamp: Date.now() }));
}

function getSuggestions(): ExtendedAnime[] | undefined {
  const item = cache.get("suggestions");
  if (!item) return undefined;

  const json = JSON.parse(item) as CacheItem;
  if (json.timestamp + 1000 * 60 * 60 * 24 * 7 < Date.now()) {
    cache.remove("suggestions");
    return undefined;
  }

  return json.suggestions;
}

export default function useSearch({ q: searchText, debounce = 500 }: SearchProps) {
  const [items, setItems] = useState<(ExtendedAnime & { isInWatchlist: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const preferences = getPreferenceValues<Preferences>();

  const clearCache = useCallback(() => {
    cache.remove("suggestions");
    cache.remove("watchlist");
  }, []);

  useEffect(() => {
    const _debounce = searchText === "" ? 0 : debounce;

    setIsLoading(true);
    const timeout = setTimeout(async () => {
      const isAuthed = await isSignedIn();

      const watchlist = isAuthed ? await getAnimeWatchlist() : [];

      const isInWatchlistMap = (anime: ExtendedAnime) => ({
        ...anime,
        isInWatchlist: watchlist.some((w) => w.id === anime.id),
      });

      if (!searchText) {
        const cached = getSuggestions();
        if (cached) {
          setItems(cached.map(isInWatchlistMap));
          setIsLoading(false);
          return;
        }

        // No search, get some suggestions to fill the void
        const res = (await fetchSuggestions({ nsfw: !preferences.hide_nsfw, anon: !isAuthed })) ?? [];
        storeSuggestions(res);
        setItems(res.map(isInWatchlistMap));
      } else {
        // If there is a search query, fetch the animes
        const res = (await fetchAnimes(searchText, { nsfw: !preferences.hide_nsfw, anon: !isAuthed })) ?? [];
        setItems(res.map(isInWatchlistMap));
      }

      setIsLoading(false);
    }, _debounce);
    return () => clearTimeout(timeout);
  }, [searchText, preferences.hide_nsfw, debounce]);

  return { items, isLoading, clearCache };
}
