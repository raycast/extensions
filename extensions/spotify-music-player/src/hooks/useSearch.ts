import { useCachedPromise } from "@raycast/utils";
import { search } from "../api/search";

type UseSearchProps = {
  query: string;
  options?: {
    execute?: boolean;
    keepPreviousData?: boolean;
  };
};

export function useSearch({ query, options }: UseSearchProps) {
  const { data, error, isLoading } = useCachedPromise(
    (searchQuery: string) => search({ query: searchQuery }),
    [query],
    {
      execute: options?.execute !== false && query.trim().length > 0,
      keepPreviousData: options?.keepPreviousData,
    },
  );

  return {
    searchData: data,
    searchError: error,
    searchIsLoading: isLoading,
  };
}
