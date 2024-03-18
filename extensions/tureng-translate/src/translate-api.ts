import { useFetch } from "@raycast/utils";
import { useRef } from "react";

export type Lang = "en" | "de" | "es" | "fr" | "tr";

const BACKEND = `https://tureng-api.bgure.workers.dev/`;

export interface TranslatedResult {
  category: string;
  q: string;
  translated: string;
  key: string;
  path: string;
}

interface ApiResult {
  results: TranslatedResult[];
  total: number;
  limit: number;
}

/**
 *  Fetches the translation from the backend
 *
 * @param searchText
 * @param source
 * @param target
 * @returns
 */
export function useTranslate(searchText: string, source: Lang, target: Lang) {
  // It's a workaround to keep the total count of the results
  const totalRef = useRef<number>(0);

  // It only works when a passed url as a function otherwise it seems doesn't update the cached data
  // in the docs it says it should work with a string but i can't make it work.
  // https://developers.raycast.com/utilities/react-hooks/usefetch#argument-dependent-on-list-search-text
  const fetched = useFetch<ApiResult, undefined, TranslatedResult[]>(
    () => `${BACKEND}?${new URLSearchParams({ sl: source, tl: target, q: searchText }).toString()}`,
    {
      execute: searchText.length > 0,
      headers: {
        "Content-Type": "application/json",
      },
      mapResult: (result: ApiResult) => {
        totalRef.current = result.total;
        return {
          data: result.results,
          // this seems doesn't work.
          // total: result.total,
          hasMore: false,
        };
      },
      parseResponse: (response) => response.json(),
      keepPreviousData: true,
    },
  );

  return {
    ...fetched,
    hasResults: fetched && fetched.data && fetched.data.length > 0,
    total: totalRef.current,
  };
}
