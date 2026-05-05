import { useMemo } from "react";
import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

const ENDPOINT = new URL("https://api.search.brave.com/res/v1/images/search");

interface ApiImageSearchData {
  results: ApiImageSearchResult[];
}

interface ApiImageSearchResult {
  type: string;
  title: string;
  url: string;
  thumbnail: {
    src: string;
    height: number;
    width: number;
  };
  properties: {
    url: string;
    title: string;
  };
}

interface ImageSearchResult {
  id: string;
  icon: string;
  title: string;
  url: URL;
  sourceUrl: URL;
}

const toResult = (result: ApiImageSearchResult): ImageSearchResult => {
  return {
    id: "image" + result.type + result.properties.url,
    icon: result.thumbnail.src,
    title: result.title || result.properties.title || "Untitled Image",
    url: new URL(result.url),
    sourceUrl: new URL(result.properties.url),
  };
};

const fallback: ImageSearchResult[] = [];

export default function useImageSearch(query: string, execute: boolean) {
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

  const { isLoading, data } = useFetch<ApiImageSearchData>(url.toString(), {
    headers,
    execute,
    keepPreviousData: false,
  });

  const results = useMemo(() => {
    if (execute === false) return fallback;

    return data?.results.map(toResult) ?? fallback;
  }, [data, execute]);

  return { isLoadingImageSearch: isLoading, imageSearchResults: results };
}
