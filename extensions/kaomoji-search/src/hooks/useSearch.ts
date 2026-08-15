import { usePromise } from "@raycast/utils";
import { performSearch } from "../utils/search";

export function useSearch(searchText: string) {
  const { isLoading, data = [] } = usePromise(async (search) => await performSearch(search), [searchText], {
    failureToastOptions: {
      title: "Could not perform search",
    },
  });

  return {
    isLoading,
    results: data,
  };
}
