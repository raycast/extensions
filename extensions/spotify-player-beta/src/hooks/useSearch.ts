import { useCachedPromise } from "@raycast/utils";
import { search } from "../api/search";

type UseSearchProps = {
  query: string;
  limit: number;
  options?: {
    execute?: boolean;
    keepPreviousData?: boolean;
  };
};

export function useSearch({ query, limit, options }: UseSearchProps) {
  const { data, error, isLoading } = useCachedPromise(
    (query: string, limit: number) => search({ query, limit }),
    [query, limit],
    {
      execute: options?.execute !== false && Boolean(query) && Boolean(limit),
      keepPreviousData: options?.keepPreviousData,
    }
  );

  return { searchData: data, searchError: error, searchIsLoading: isLoading };
}
