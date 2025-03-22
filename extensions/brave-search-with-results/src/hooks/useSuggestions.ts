import { useMemo } from "react";
import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

const ENDPOINT = new URL("https://api.search.brave.com/res/v1/suggest/search");

interface ApiSuggestionsData {
  results: ApiSuggestionsResult[];
}

interface ApiSuggestionsResult {
  query: string;
}

interface SuggestionsResult {
  id: string;
  query: string;
}

const toResult = (result: ApiSuggestionsResult): SuggestionsResult => {
  return {
    id: "result" + result.query,
    query: result.query,
  };
};

const fallback: SuggestionsResult[] = [];

export default function useSuggestions(query: string, execute: boolean) {
  const { suggest_api_key } = getPreferenceValues();
  const trimmedQuery = query.trim();

  const url = useMemo(() => {
    const url = new URL(ENDPOINT.toString());
    url.searchParams.append("q", trimmedQuery);
    url.searchParams.append("count", "10");
    return url;
  }, [trimmedQuery]);

  const headers = useMemo(() => {
    return {
      "X-Subscription-Token": suggest_api_key,
      Accept: "application/json",
      "Accept-Encoding": "gzip",
    };
  }, [suggest_api_key]);

  const { isLoading, data } = useFetch<ApiSuggestionsData>(url.toString(), {
    headers,
    execute,
    keepPreviousData: true,
  });

  const filteredResults = useMemo(() => {
    return data?.results.filter((result) => result.query !== trimmedQuery).map(toResult) ?? [];
  }, [data]);

  const results = useMemo(() => {
    if (execute === false) return fallback;

    return [
      {
        id: "input",
        query: trimmedQuery,
      },
      ...filteredResults,
    ];
  }, [trimmedQuery, filteredResults, execute]);

  return { isLoading, results };
}
