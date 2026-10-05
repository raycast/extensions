import { useMemo } from "react";

import { captureException } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import type { ErrorResult, SearchResult, SearchResults } from "@/types";

import { onErrorCapture } from "@/lib/errors";
import { generateSearchBody } from "@/lib/searchBody";

import { useQueryParser } from "@/hooks/useQueryParser";
import { useSearchAPIData } from "@/hooks/useSearchAPIData";

export const useJSRSearch = (queryString: string, scoped: string | null) => {
  const { query, scope, triggerQuery, runtimes, searchQueryURL } = useQueryParser(queryString, scoped);
  const { data: apiData, isLoading: isLoadingAPIData, error: apiDataError, refresh } = useSearchAPIData();

  const searchURL = apiData ? `https://collections.orama.com/v1/collections/${apiData.projectId}/search` : "";

  const body = useMemo(() => generateSearchBody(query, scope, runtimes), [query, scope, runtimes]);

  const {
    isLoading,
    error: dataError,
    ...rest
  } = useFetch<SearchResults | ErrorResult, SearchResult[], SearchResult[]>(searchURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiData?.apiKey ?? ""}`,
    },
    body,
    execute: !!apiData && !!triggerQuery && !!searchURL,
    keepPreviousData: true,
    initialData: [] as SearchResult[],
    onError: onErrorCapture,
    failureToastOptions: { title: "Error fetching JSR search results" },
    parseResponse: async (response) => {
      if (response.status === 401) {
        void refresh();
        return { message: "401 Unauthorized — refreshing credentials" } as ErrorResult;
      }
      return (await response.json()) as SearchResults | ErrorResult;
    },
    mapResult: (data) => {
      if ("message" in data) {
        captureException(data.message);
        return { data: [] as SearchResult[] };
      }
      return { data: data.hits.filter((h) => !!h.id && !!h.document.id) };
    },
  });

  return { isLoading: isLoading || isLoadingAPIData, error: dataError || apiDataError, ...rest, searchQueryURL };
};
