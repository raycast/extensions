import { useFetch } from "@raycast/utils";
import { Monitor } from "../types";
import { API_BASE_URL } from "../constants";

export function useMonitors(apiKey: string) {
  const { data, isLoading, error } = useFetch<{ data: Monitor[] }>(
    apiKey ? `${API_BASE_URL}/monitors` : "",
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      execute: !!apiKey,
    },
  );

  const monitors = data?.data || [];

  return {
    monitors,
    isLoading,
    error: error?.message || null,
  };
}
