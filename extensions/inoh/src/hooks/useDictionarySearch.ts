import { useCachedPromise } from "@raycast/utils";
import { searchDictionary } from "../lib/dictionary";

/**
 * Hook that searches the dictionary with debounced, cached queries.
 * Keeps previous results visible while new results load.
 */
export function useDictionarySearch(searchText: string) {
  const { data, isLoading, error } = useCachedPromise((query: string) => searchDictionary(query), [searchText], {
    execute: searchText.length > 0,
    keepPreviousData: true,
  });

  return { results: data ?? null, isLoading, error };
}
