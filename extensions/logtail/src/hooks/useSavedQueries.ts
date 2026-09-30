import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";
import { Logtail } from "../lib/logtail";

export type UseSavedQueriesResult = UseCachedPromiseReturnType<string[], undefined> & {
  addQuery: (query: string) => Promise<string[]>;
  removeQuery: (query: string) => Promise<string[]>;
};
export const useSavedQueries = (): UseSavedQueriesResult => {
  const result = useCachedPromise(() => LocalStorage.getItem<string>(Logtail.SAVED_QUERY_CACHE_KEY));
  const data = result.data ? JSON.parse(result.data) : [];

  const addQuery = async (query: string) => {
    const newQueries: string[] = Array.from(new Set([...data, query]));
    await LocalStorage.setItem(Logtail.SAVED_QUERY_CACHE_KEY, JSON.stringify(newQueries));
    result.mutate(LocalStorage.getItem<string>(Logtail.SAVED_QUERY_CACHE_KEY));
    await showToast(Toast.Style.Success, "Query saved");
    return newQueries;
  };

  const removeQuery = async (query: string) => {
    const savedQueries: string[] = data;
    const newQueries = savedQueries.filter((q) => q !== query);
    await LocalStorage.setItem(Logtail.SAVED_QUERY_CACHE_KEY, JSON.stringify(newQueries));
    result.mutate(LocalStorage.getItem<string>(Logtail.SAVED_QUERY_CACHE_KEY));
    await showToast(Toast.Style.Success, "Query removed");
    return newQueries;
  };

  return {
    ...result,

    data,
    addQuery,
    removeQuery,
  } as UseSavedQueriesResult;
};
