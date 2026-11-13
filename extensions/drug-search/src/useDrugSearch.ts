import { useRef } from "react";
import { useFetch } from "@raycast/utils";
import { buildDrugSearchUrl, parseDrugSearchResponse } from "./drug-search-api";

/** Search drug name fields, or browse all drugs when the search is blank. */
export function useDrugSearch(search: string, sort?: string) {
  const searchUrl = buildDrugSearchUrl(search, 0, sort);
  const completedSearch = useRef<string | undefined>(undefined);
  const { isLoading, data, error, pagination } = useFetch((options) => buildDrugSearchUrl(search, options.page, sort), {
    parseResponse: parseDrugSearchResponse,
    mapResult: (page) => page,
    onData() {
      completedSearch.current = searchUrl;
    },
    onError() {
      // The list presents genuine API errors without a duplicate toast.
    },
    keepPreviousData: false,
    initialData: [],
  });

  // useFetch may retain old paginated data even with keepPreviousData disabled.
  // Only expose rows after a request for the current name has completed.
  const currentError = isLoading ? undefined : error;
  return {
    isLoading,
    data: currentError || completedSearch.current !== searchUrl ? [] : data,
    error: currentError as Error | undefined,
    pagination,
  };
}
