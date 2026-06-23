import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

function normalizeHost(host?: string) {
  if (!host) return "https://us.posthog.com";
  const normalized = host.replace(/\/$/, "");
  if (normalized === "https://app.posthog.com") return "https://us.posthog.com";
  return normalized;
}

export function usePostHogClient<T>(
  path: string,
  { execute, onData }: { execute: boolean; onData: (data: T) => void } = {
    execute: true,
    onData: (() => null) as (data: T) => void,
  },
) {
  const { dataRegionURL, personalAPIKey } = getPreferenceValues<{ dataRegionURL?: string; personalAPIKey?: string }>();

  return useFetch<T>(`${normalizeHost(dataRegionURL)}/api/${path}`, {
    keepPreviousData: true,
    headers: personalAPIKey
      ? {
          Authorization: `Bearer ${personalAPIKey}`,
        }
      : undefined,
    execute,
    onData,
  });
}
