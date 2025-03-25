import * as cheerio from "cheerio";
import fetch, { FormData } from "node-fetch";
import { useMemo, useRef } from "react";

import { captureException, environment } from "@raycast/api";
import { useCachedPromise, useFetch } from "@raycast/utils";

import type { ErrorResult, SearchResult, SearchResults } from "@/types";

type SearchAPIData = {
  apiKey: string;
  indexId: string;
};
type SearchAPIDataResponse = {
  v: Array<Array<object | SearchAPIData> | Array<never>>;
};

/**
 * This function will download the frontpage of jsr.io and extract the apiKey + indexId from the script tags.
 */
const useSearchAPIData = () => {
  return useFetch<SearchAPIData | null>("https://jsr.io", {
    method: "GET",
    headers: {
      Agent: `Raycast/${environment.raycastVersion} ${environment.extensionName} (https://raycast.com)`,
    },
    keepPreviousData: true,
    parseResponse: async (response) => {
      let res: SearchAPIData | null = null;
      const text = await response.text();
      const $ = cheerio.load(text);

      const scriptElements = $("script");

      scriptElements.each((index, element) => {
        const script = $(element).html();

        if (script?.includes(`apiKey`)) {
          const start = script.indexOf(`"[[`) + 1;
          const end = script.indexOf(`]"`) + 1;
          const slice = script.slice(start, end).replace(/\\/g, "");
          try {
            const arr = JSON.parse(slice);
            // find element that is string and starts with 'jsr-'
            const indexIdPosition = arr.findIndex(
              (item: unknown) => typeof item === "string" && item.startsWith("jsr-"),
            );
            if (indexIdPosition !== -1 && indexIdPosition > 0 && typeof arr[indexIdPosition - 1] === "string") {
              res = { apiKey: arr[indexIdPosition - 1], indexId: arr[indexIdPosition] };
            }
            // eslint-disable-next-line no-empty
          } catch (_) {}
        }

        if (script?.includes(`"apiKey"`)) {
          const json = JSON.parse(script) as SearchAPIDataResponse;
          const searchAPIData = json.v[0].find((item) => "apiKey" in item && "indexId" in item) as
            | SearchAPIData
            | undefined;
          if (searchAPIData) {
            res = searchAPIData;
          }
        }
      });

      return res;
    },
  });
};

export const useJSRSearch = (queryString: string) => {
  const query = queryString?.trim() || "";
  const { data: apiData, isLoading: isLoadingAPIData, error: apiDataError } = useSearchAPIData();
  const abortable = useRef<AbortController>();

  const searchURL = useMemo(() => {
    if (!apiData || isLoadingAPIData) {
      return null;
    }
    return `https://cloud.orama.run/v1/indexes/${apiData.indexId}/search?api-key=${apiData.apiKey}`;
  }, [apiData, isLoadingAPIData]);

  const formData = useMemo(() => {
    const body = { term: query, limit: 20, mode: "fulltext" };
    const formData = new FormData();
    formData.append("q", JSON.stringify(body));
    return formData;
  }, [query]);

  const {
    isLoading,
    error: dataError,
    ...rest
  } = useCachedPromise(
    async (url: string | null, query: string) => {
      if (!url || !query) {
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
    [searchURL, query],
    {
      abortable,
      initialData: [] as SearchResult[],
    },
  );

  return { isLoading: isLoading || isLoadingAPIData, error: dataError || apiDataError, ...rest };
};
