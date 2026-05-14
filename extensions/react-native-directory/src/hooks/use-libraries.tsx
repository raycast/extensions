import { useFetch } from "@raycast/utils";
import { LibraryType, Query, QueryOrder } from "../types";
import { urlWithQuery } from "../utils";
import { BASE_API_URL } from "../constants";
import { getPreferenceValues } from "@raycast/api";

type SearchResult = {
  libraries: LibraryType[];
};

const { libraries_sort_order } = getPreferenceValues<Preferences>();

export const useLibraries = (searchText: string, sortOrder: QueryOrder, filter: string) => {
  const { data, error, isLoading, pagination } = useFetch<{ libraries: LibraryType[] }>(
    ({ page }: { page: number }) => {
      const query: Query = {
        search: searchText,
        order: sortOrder,
        direction: libraries_sort_order,
        offset: page * 25,
        limit: 25,
        ...(filter && { [filter]: true }),
      };
      return urlWithQuery(BASE_API_URL, query);
    },
    {
      keepPreviousData: true,
      mapResult: (result: SearchResult) => ({
        data: result.libraries,
        hasMore: result.libraries.length === 25,
      }),
    },
  );

  return {
    libraries: data,
    librariesError: error,
    isLibrariesLoading: isLoading,
    librariesPagination: pagination,
  };
};
