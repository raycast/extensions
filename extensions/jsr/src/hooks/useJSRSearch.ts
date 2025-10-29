import { useMemo, useRef } from "react";

import { captureException } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import type { ErrorResult, SearchResult, SearchResults } from "@/types";

import { useQueryParser } from "@/hooks/useQueryParser";
import { useSearchAPIData } from "@/hooks/useSearchAPIData";

export const useJSRSearch = (queryString: string, scoped: string | null) => {
  const { query, scope, triggerQuery, runtimes } = useQueryParser(queryString, scoped);
  const { data: apiData, isLoading: isLoadingAPIData, error: apiDataError } = useSearchAPIData();
  const abortable = useRef<AbortController>(null);

  const searchURL = useMemo(() => {
    if (!apiData || isLoadingAPIData) {
      return null;
    }
    return `https://cloud.orama.run/v1/indexes/${apiData.indexId}/search?api-key=${apiData.apiKey}`;
  }, [apiData, isLoadingAPIData]);

  const formData = useMemo(() => {
    const whereClauses = Array<{ [key: string]: unknown }>();
    if (scope) {
      whereClauses.push({ scope: scope });
    }
    Object.entries(runtimes).forEach(([key, value]) => {
      if (value) {
        whereClauses.push({ [`runtimeCompat.${key}`]: true });
      }
    });
    const whereClause =
      whereClauses.length > 0 ? { where: whereClauses.reduce((acc, clause) => ({ ...acc, ...clause }), {}) } : {};
    const body = {
      term: query,
      limit: 50,
      mode: "fulltext",
      boost: { id: 3, scope: 2, name: 1, description: 0.5 },
      ...whereClause,
    };
    const formData = new FormData();
    formData.append("q", JSON.stringify(body));
    return formData;
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

  return { isLoading: isLoading || isLoadingAPIData, error: dataError || apiDataError, ...rest };
};
