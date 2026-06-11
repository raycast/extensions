import { apiRequest } from "@/functions/apiRequest";
import { CollectionResult, Orientation, SearchResult } from "@/types";
import { useCachedPromise } from "@raycast/utils";

type SearchType = "photos" | "collections";
type ResultFor<T extends SearchType> = T extends "collections" ? CollectionResult : SearchResult;

export function useSearch<T extends SearchType>(query: string, type: T, orientation: Orientation) {
  const { isLoading, data, pagination, error } = useCachedPromise(
    (text: string, orient: Orientation) => async (options: { page: number }) => {
      if (!text.trim()) return { data: [] as ResultFor<T>[], hasMore: false };

      const page = options.page + 1;
      const params = new URLSearchParams({ page: String(page), query: text, per_page: "30" });
      if (orient !== "all") params.append("orientation", orient);

      const { results, total_pages } = await apiRequest<{ results: ResultFor<T>[]; total_pages: number }>(
        `/search/${type}?${params}`,
      );

      return { data: results, hasMore: page < total_pages };
    },
    [query, orientation],
    {
      initialData: [] as ResultFor<T>[],
      failureToastOptions: { title: `Failed to fetch ${type}.` },
    },
  );

  return { state: { results: data, isLoading, pagination }, error };
}

export default useSearch;
