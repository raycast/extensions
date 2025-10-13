import { useFetch } from "@raycast/utils";
import { useMemo } from "react";

import { getApiOptions, getApiUrl, type SearchResults, type SearchResult } from "@/utils/api";

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
      (response.json() as Promise<SearchResults>)
        .then((data) => data?.query?.search || [])
        .then((data) => data.filter((page, index, self) => self.findIndex((p) => p.pageid === page.pageid) === index))
        .then((results) => ({ language, results })),
  });
}
