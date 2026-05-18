import { useMemo, useRef } from "react";

import { captureException } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import type { ErrorResult, SearchResult, SearchResults } from "@/types";

import { generateSearchBody } from "@/lib/searchBody";

import { useQueryParser } from "@/hooks/useQueryParser";
import { useSearchAPIData } from "@/hooks/useSearchAPIData";

export const useJSRSearch = (queryString: string, scoped: string | null) => {
  const { query, scope, triggerQuery, runtimes, searchQueryURL } = useQueryParser(queryString, scoped);
  const { data: apiData, isLoading: isLoadingAPIData, error: apiDataError } = useSearchAPIData();
  const abortable = useRef<AbortController | null>(null);

  const searchURL = useMemo(() => {
    if (!apiData || isLoadingAPIData) {
      return null;
    }
    return `https://collections.orama.com/v1/collections/${apiData.projectId}/search`;
  }, [apiData, isLoadingAPIData]);

  const apiKey = apiData?.apiKey ?? null;

  const body = useMemo(() => {
    return generateSearchBody(query, scope, runtimes);
  }, [query, scope, runtimes]);

  const {
    isLoading,
    error: dataError,
    ...rest
  } = useCachedPromise(
    async (url: string | null, key: string | null, triggerQuery: string) => {
      if (!url || !key || !triggerQuery) {
        return [] as SearchResult[];
      }
      return fetch(url, {
        method: "POST",
        signal: abortable.current?.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body,
      })
        .then((response) => response.json() as Promise<SearchResults | ErrorResult>)
        .then((data) => {
          if ("message" in data) {
            captureException(data.message);
            return [];
          }

          return data.hits.filter((h) => !!h.id && !!h.document.id);
        });
    },
    [searchURL, apiKey, triggerQuery],
    {
      abortable,
      initialData: [] as SearchResult[],
    },
  );

  return { isLoading: isLoading || isLoadingAPIData, error: dataError || apiDataError, ...rest, searchQueryURL };
};
