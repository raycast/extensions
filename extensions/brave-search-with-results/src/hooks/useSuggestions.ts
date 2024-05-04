import { useMemo } from "react";
import { getPreferenceValues } from "@raycast/api";

import useFetch from "./useFetch";

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

  const { isLoading, data } = useFetch<ApiSuggestionsData>(
    url,
    {
      headers,
    },
    execute,
  );

  const filteredResults = useMemo(() => {
    return [...(data?.results.filter((result) => result.query !== trimmedQuery).map(toResult) ?? [])];
  }, [data]);

  const finalResults = useMemo(() => {
    return [
      {
        id: "input",
        query: trimmedQuery,
      },
      ...filteredResults,
    ];
  }, [trimmedQuery, filteredResults]);

  return { isLoading, results: finalResults };
}
