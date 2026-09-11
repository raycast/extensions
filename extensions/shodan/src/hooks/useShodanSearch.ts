import { showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { shodanClient } from "../api/client";

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
  const { data, isLoading, error, revalidate, mutate } = usePromise(
    async (q: string, p: number) => {
      // Extra safety check to prevent empty queries
      if (!q || q.trim().length === 0) {
        return { matches: [], total: 0 };
      }
      return await shodanClient.search(q, p);
    },
    [query, page],
    {
      execute: enabled && query.length > 0,
      onError: (err) => {
        let message = err.message;

        // Handle specific error types
        if (err.name === "AuthenticationError") {
          message = "Invalid API key. Please check your extension preferences.";
        } else if (err.name === "RateLimitError") {
          message = err.message; // Already includes wait time if available
        } else if (err.name === "InsufficientCreditsError") {
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
