import { usePromise } from "@raycast/utils";
import type { ChromeProfile } from "../types";
import { getChromeAppPath } from "../lib/chrome-paths";
import { loadProfiles } from "../lib/chrome-profiles";

export type UseChromeProfiles = {
  profiles: ChromeProfile[];
  isLoading: boolean;
  error?: Error;
  chromeInstalled: boolean;
  refresh: () => void;
};

/** Load Chrome profiles with loading/error state and a refresh action. */
export function useChromeProfiles(): UseChromeProfiles {
  const { data, isLoading, error, revalidate } = usePromise(loadProfiles, []);
  return {
    profiles: data ?? [],
    isLoading,
    error,
    chromeInstalled: getChromeAppPath() !== undefined,
    refresh: revalidate,
  };
}
