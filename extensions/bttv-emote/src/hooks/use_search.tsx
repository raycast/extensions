import { useRef } from "react";
import { performSearch } from "../api/bttv_api";
import { useCachedPromise } from "@raycast/utils";

export function useSearch(query: string) {
  const cancelRef = useRef<AbortController | null>(null);
  const { isLoading, data, pagination } = useCachedPromise(
    (searchText: string) => async (options) => {
      if (searchText.length < 2) return { data: [] };
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      const results = await performSearch(searchText, cancelRef.current.signal, options.page);
      return { data: results };
    },
    [query],
    {
      abortable: cancelRef,
      initialData: [],
      failureToastOptions: {
        title: "Error",
        message: "Emote not found",
      },
    },
  );
  return {
    isLoading,
    results: data,
    pagination,
  };
}
