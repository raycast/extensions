import { useFetch } from "@raycast/utils";
import { useMemo } from "react";

import { getApiOptions, getApiUrl } from "@/utils/api";
export interface SearchResult {
  ns: number;
  title: string;
  pageid: number;
  size: number;
  wordcount: number;
  snippet: string;
  timestamp: string;
}

export interface Result {
  query: { search: SearchResult[] };
}

export default function useFindPagesByTitle(search: string, language: string) {
  const url = useMemo(() => {
    const url = new URL(`${getApiUrl(language)}w/api.php`);
    url.searchParams.set("action", "query");
    url.searchParams.set("list", "search");
    url.searchParams.set("format", "json");
    url.searchParams.set("srsearch", search);
    url.searchParams.set("srlimit", "9");

    return url.toString();
  }, [search, language]);

  return useFetch<{ language: string; results: SearchResult[] }>(url, {
    headers: getApiOptions(language)?.headers,
    keepPreviousData: true,
    parseResponse: (response) =>
      (response.json() as Promise<Result>)
        .then((data) => data?.query?.search || [])
        .then((data) => data.filter((page, index, self) => self.findIndex((p) => p.pageid === page.pageid) === index))
        .then((results) => ({ language, results })),
  });
}
