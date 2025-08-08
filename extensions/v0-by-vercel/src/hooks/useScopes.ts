import { useFetch } from "@raycast/utils";
import type { ScopeSummary, FindScopesResponse } from "../types";

interface UseScopesResult {
  scopes: ScopeSummary[];
  isLoadingScopes: boolean;
  scopesError: Error | undefined;
  revalidateScopes: () => void;
}

export function useScopes(apiKey: string | undefined, execute: boolean = true): UseScopesResult {
  const { isLoading, data, error, revalidate } = useFetch<FindScopesResponse>(
    apiKey ? "https://api.v0.dev/v1/user/scopes" : "",
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      parseResponse: (response) => response.json(),
      execute: !!apiKey && execute,
    },
  );

  return {
    scopes: data?.data || [],
    isLoadingScopes: isLoading,
    scopesError: error,
    revalidateScopes: revalidate,
  };
}
