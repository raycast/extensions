import { Cache, getPreferenceValues } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import { Anime, ExtendedAnime, fetchAnimes, fetchSuggestions } from "./api";
import { isSignedIn } from "./oauth";

type SearchProps = {
  q: string;
  debounce?: number;
};

type Preferences = {
  view?: "list-detailed" | "list" | "grid";
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
  const [items, setItems] = useState<ExtendedAnime[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    let _debounce = searchText == "" ? 0 : debounce;

    setIsLoading(true);
    const timeout = setTimeout(async () => {
      const isAuthed = await isSignedIn();

      if (!searchText) {
        const cached = getSuggestions();
        if (cached) {
          setItems(cached);
          setIsLoading(false);
          return;
        }

        // No search, get some suggestions to fill the void
        const res = (await fetchSuggestions({ nsfw: !preferences.hide_nsfw, anon: !isAuthed })) ?? [];
        storeSuggestions(res);
        setItems(res);
      } else {
        // If there is a search query, fetch the animes
        const res = (await fetchAnimes(searchText, { nsfw: !preferences.hide_nsfw, anon: !isAuthed })) ?? [];
        setItems(res);
      }

      setIsLoading(false);
    }, _debounce);
    return () => clearTimeout(timeout);
  }, [searchText, preferences.hide_nsfw]);

  return { items, isLoading };
}
