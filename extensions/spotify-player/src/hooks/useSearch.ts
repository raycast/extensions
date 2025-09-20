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
  const { data, error, isLoading } = useCachedPromise((query: string) => search({ query }), [query], {
    execute: options?.execute !== false && Boolean(query),
    keepPreviousData: options?.keepPreviousData,
  });

  return { searchData: data, searchError: error, searchIsLoading: isLoading };
}
