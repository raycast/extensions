import { useMemo } from "react";
import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

const ENDPOINT = new URL("https://api.search.brave.com/res/v1/web/search");

interface ApiWebSearchData {
  web: {
    results: ApiWebSearchResult[];
  };
}

interface ApiWebSearchResult {
  type: string;
  title: string;
  url: string;
  meta_url: {
    favicon: string;
  };
}

interface WebSearchResult {
  id: string;
  icon: string;
  title: string;
  url: URL;
}

const toResult = (result: ApiWebSearchResult): WebSearchResult => {
  return {
    id: "web" + result.type + result.url,
    icon: result.meta_url.favicon,
    title: result.title,
    url: new URL(result.url),
  };
};

const fallback: WebSearchResult[] = [];

export default function useWebSearch(query: string, execute: boolean) {
  const { data_for_search_api_key } = getPreferenceValues();

  const url = useMemo(() => {
    const url = new URL(ENDPOINT.toString());
    url.searchParams.append("q", query);
    return url;
  }, [query]);

  const headers = useMemo(() => {
    return {
      "X-Subscription-Token": data_for_search_api_key,
      Accept: "application/json",
      "Accept-Encoding": "gzip",
    };
  }, [data_for_search_api_key]);

  const { isLoading, data } = useFetch<ApiWebSearchData>(url.toString(), {
    headers,
    execute,
    keepPreviousData: false,
  });

  const results = useMemo(() => {
    if (execute === false) return fallback;

    return data?.web.results.map(toResult) ?? fallback;
  }, [data, execute]);

  return { isLoadingWebSearch: isLoading, webSearchResults: results };
}
