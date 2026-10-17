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
    id: "suggestion" + result.query,
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
    // Remove the current query from the suggestion results, as this item will be added
    // as the first item in the results immediately after the query has changed.
    return data?.results.filter((result) => result.query !== trimmedQuery).map(toResult) ?? fallback;
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

  return { isLoadingSuggestions: isLoading, suggestionsResults: results };
}
