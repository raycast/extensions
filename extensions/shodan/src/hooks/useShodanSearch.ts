import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Preferences, ShodanSearchResponse } from "../api/types";

interface UseShodanSearchOptions {
  query: string;
  page?: number;
  enabled?: boolean;
}

export function useShodanSearch({
  query,
  page = 1,
  enabled = true,
}: UseShodanSearchOptions) {
  const { apiKey } = getPreferenceValues<Preferences>();

  const { data, isLoading, error, revalidate, mutate } =
    useFetch<ShodanSearchResponse>(
      `https://api.shodan.io/shodan/host/search?key=${apiKey}&query=${encodeURIComponent(query)}&page=${page}`,
      {
        execute: enabled && query.length > 0,
        keepPreviousData: true,
        onError: (err) => {
          let message = err.message;
          if (message.includes("401")) {
            message =
              "Invalid API key. Please check your extension preferences.";
          } else if (message.includes("429")) {
            message =
              "Rate limit exceeded. Please wait before searching again.";
          } else if (message.includes("402")) {
            message = "Insufficient credits. Upgrade your Shodan plan.";
          }

          showToast({
            style: Toast.Style.Failure,
            title: "Search Failed",
            message,
          });
        },
      },
    );

  return {
    results: data?.matches ?? [],
    total: data?.total ?? 0,
    facets: data?.facets,
    isLoading,
    error,
    revalidate,
    mutate,
  };
}
