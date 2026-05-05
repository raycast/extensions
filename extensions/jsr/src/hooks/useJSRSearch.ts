import { useMemo, useRef } from "react";

import { captureException } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import type { ErrorResult, SearchResult, SearchResults } from "@/types";

import { generateFormData } from "@/lib/formdata";

import { useQueryParser } from "@/hooks/useQueryParser";
import { useSearchAPIData } from "@/hooks/useSearchAPIData";

export const useJSRSearch = (queryString: string, scoped: string | null) => {
  const { query, scope, triggerQuery, runtimes, searchQueryURL } = useQueryParser(queryString, scoped);
  const { data: apiData, isLoading: isLoadingAPIData, error: apiDataError } = useSearchAPIData();
  const abortable = useRef<AbortController>(null);

  const searchURL = useMemo(() => {
    if (!apiData || isLoadingAPIData) {
      return null;
    }
    return `https://cloud.orama.run/v1/indexes/${apiData.indexId}/search?api-key=${apiData.apiKey}`;
  }, [apiData, isLoadingAPIData]);

  const formData = useMemo(() => {
    return generateFormData(query, scope, runtimes);
  }, [query, scope, runtimes]);

  const {
    isLoading,
    error: dataError,
    ...rest
  } = useCachedPromise(
    async (url: string | null, triggerQuery: string) => {
      if (!url || !triggerQuery) {
        return [] as SearchResult[];
      }
      return fetch(url, {
        method: "POST",
        signal: abortable.current?.signal,
        body: formData,
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
    [searchURL, triggerQuery],
    {
      abortable,
      initialData: [] as SearchResult[],
    },
  );

  return { isLoading: isLoading || isLoadingAPIData, error: dataError || apiDataError, ...rest, searchQueryURL };
};
