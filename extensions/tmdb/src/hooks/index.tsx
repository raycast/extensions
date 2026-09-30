import { LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { moviedb } from "../api";

export type RecentSearch = {
  name: string;
  id: number;
};

export function useRecentSearches(localStorageKey: string) {
  const { data, isLoading, mutate } = useCachedPromise(async () => {
    const recentSearchesData = await LocalStorage.getItem<string>(localStorageKey);
    const recentSearches: RecentSearch[] = recentSearchesData ? JSON.parse(recentSearchesData) : [];

    const recentSearchesWithInfo = await Promise.all(
      recentSearches.map((search) => {
        return moviedb.tvInfo({ id: search.id });
      }),
    );

    return { recentSearches, recentSearchesWithInfo };
  });

  async function addRecentSearch(search: RecentSearch) {
    if (!data) {
      return;
    }

    const newRecentSearches = [search, ...data.recentSearches.filter((s) => s.id !== search.id)].slice(0, 10);

    await LocalStorage.setItem(localStorageKey, JSON.stringify(newRecentSearches));
    mutate();
  }

  async function removeRecentSearch(search: RecentSearch) {
    if (!data) {
      return;
    }

    const newRecentSearches = data.recentSearches.filter((s) => s.id !== search.id);
    await LocalStorage.setItem(localStorageKey, JSON.stringify(newRecentSearches));
    mutate();
  }

  return {
    recentSearches: data?.recentSearches,
    recentSearchesWithInfo: data?.recentSearchesWithInfo,
    mutate,
    addRecentSearch,
    removeRecentSearch,
    isLoading,
  };
}
