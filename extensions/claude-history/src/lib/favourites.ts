import { LocalStorage } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useCallback, useMemo } from "react";
import { FAVOURITES_KEY } from "./constants.js";

type FavouritesHook = {
  isFavourite: (sessionId: string) => boolean;
  toggleFavourite: (sessionId: string) => Promise<void>;
};

export function useFavourites(): FavouritesHook {
  const [favouritesList, setFavouritesList] = useCachedState<string[]>(
    FAVOURITES_KEY,
    [],
  );

  const favouritesSet = useMemo(
    () => new Set(favouritesList),
    [favouritesList],
  );

  const isFavourite = useCallback(
    (sessionId: string) => favouritesSet.has(sessionId),
    [favouritesSet],
  );

  const toggleFavourite = useCallback(
    async (sessionId: string) => {
      const updated = favouritesSet.has(sessionId)
        ? favouritesList.filter((id) => id !== sessionId)
        : [...favouritesList, sessionId];

      setFavouritesList(updated);
      await LocalStorage.setItem(FAVOURITES_KEY, JSON.stringify(updated));
    },
    [favouritesList, favouritesSet, setFavouritesList],
  );

  return { isFavourite, toggleFavourite };
}
