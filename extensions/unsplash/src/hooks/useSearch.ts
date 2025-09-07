import { apiRequest } from "@/functions/apiRequest";
import { CollectionResult, Orientation, SearchResult } from "@/types";
import { useCachedPromise } from "@raycast/utils";

export const useSearch = <T extends "collections" | "photos">(query: string, type: T, orientation: Orientation) => {
  const { isLoading, data, pagination } = useCachedPromise(
    (searchText: string, orientation: Orientation) => async (options: { page: number }) => {
      if (!searchText.trim())
        return {
          data: [],
          hasMore: false,
        };

      const { results, total_pages } = await performSearch({
        searchText,
        options: {
          page: options.page + 1,
          orientation,
          type: type || "photos",
        },
      });
      
      return {
        data: results,
        hasMore: options.page < total_pages,
      };
    },
    [query, orientation],
    {
      initialData: [],
      failureToastOptions: {
        title: `Failed to fetch ${type}.`,
      },
    },
  );

  return {
    state: { results: data, isLoading, pagination },
  };
};

// Perform Search
interface PerformSearchProps {
  searchText: string;
  options: {
    page: number;
    orientation: Orientation;
    type: "photos" | "collections";
  };
}

type SearchOrCollectionResult<T extends PerformSearchProps> = T extends { options: { type: "collections" } }
  ? CollectionResult[]
  : SearchResult[];

export const performSearch = async <T extends PerformSearchProps>({
  searchText,
  options,
}: PerformSearchProps): Promise<{ results: SearchOrCollectionResult<T>; total_pages: number }> => {
  const searchParams = new URLSearchParams({
    page: options.page.toString(),
    query: searchText,
    per_page: "30",
  });

  if (options.orientation !== "all") searchParams.append("orientation", options.orientation);

  const { results, total_pages } = await apiRequest<{
    results: SearchOrCollectionResult<T>;
    total_pages: number;
  }>(`/search/${options.type}?${searchParams.toString()}`);

  return {
    results,
    total_pages
  };
};

export default useSearch;
