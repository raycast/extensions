import { useFetch } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";

export function usePostHogClient<T>(
  path: string,
  { execute, onData }: { execute: boolean; onData: (data: T) => void } = {
    execute: true,
    onData: (() => null) as (data: T) => void,
  }
) {
  const { dataRegionURL, personalAPIKey } = getPreferenceValues();

  return useFetch<T>(`${dataRegionURL}/api/${path}`, {
    keepPreviousData: true,
    headers: {
      Authorization: `Bearer ${personalAPIKey}`,
    },
    execute,
    onData,
  });
}
