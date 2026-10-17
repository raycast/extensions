import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { normalizeHost } from "../src/posthog-client";

type PostHogClientOptions<T> = {
  execute?: boolean;
  onData?: (data: T) => void;
};

export function usePostHogClient<T>(
  path: string,
  { execute = true, onData = (() => null) as (data: T) => void }: PostHogClientOptions<T> = {},
) {
  const { dataRegionURL, personalAPIKey } = getPreferenceValues<Preferences>();

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
