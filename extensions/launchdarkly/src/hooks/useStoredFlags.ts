import { useCachedState } from "@raycast/utils";
import { LDFlag, StoredFlagRef } from "../types";

// Favorites and recents are shared by every mounted view (list, pushed details,
// environment rows). `useCachedState` persists the value and notifies every
// subscriber on change, so a toggle in a pushed view is reflected in the list
// underneath as soon as the user pops back. The dedicated namespace keeps this
// user data apart from the API response cache.
const CACHE_NAMESPACE = "stored-flags";
const FAVORITES_KEY = "FAVORITE_FLAGS";
const RECENTS_KEY = "RECENT_FLAGS";
const MAX_RECENTS = 10;

function sameFlag(a: StoredFlagRef, b: { projectKey: string; key: string }) {
  return a.projectKey === b.projectKey && a.key === b.key;
}

export function toFlagRef(projectKey: string, flag: LDFlag): StoredFlagRef {
  return { projectKey, key: flag.key, name: flag.name };
}

export function useFavorites(projectKey: string) {
  const [all, setAll] = useCachedState<StoredFlagRef[]>(FAVORITES_KEY, [], { cacheNamespace: CACHE_NAMESPACE });
  const favorites = all.filter((f) => f.projectKey === projectKey);

  return {
    favorites,
    isFavorite: (flag: { key: string }) => favorites.some((f) => f.key === flag.key),
    /** Returns true when the flag was added, false when it was removed. */
    toggleFavorite: (ref: StoredFlagRef): boolean => {
      const exists = all.some((f) => sameFlag(f, ref));
      setAll(exists ? all.filter((f) => !sameFlag(f, ref)) : [...all, ref]);
      return !exists;
    },
  };
}

export function useRecents(projectKey: string) {
  const [all, setAll] = useCachedState<StoredFlagRef[]>(RECENTS_KEY, [], { cacheNamespace: CACHE_NAMESPACE });
  const recents = all.filter((f) => f.projectKey === projectKey);

  return {
    recents,
    recordVisit: (ref: StoredFlagRef) => {
      const rest = all.filter((f) => !sameFlag(f, ref));
      setAll([{ ...ref, visitedAt: Date.now() }, ...rest].slice(0, MAX_RECENTS * 3));
    },
    clearRecents: () => setAll(all.filter((f) => f.projectKey !== projectKey)),
  };
}
