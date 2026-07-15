import { useCachedPromise } from "@raycast/utils";
import { getAllApps } from "../helpers/apps";

/**
 * React hook to load the visible apps list using Raycast's caching helper.
 *
 * - Uses getAllApps() which merges defaults + custom apps and respects settings
 * - Caches results between renders and across navigations
 * - Exposes revalidate() to refresh after settings/import changes
 */
export function useApps() {
  const { data, isLoading, error, revalidate } = useCachedPromise(getAllApps, [], { keepPreviousData: true });

  return {
    apps: data ?? [],
    isLoading,
    error,
    revalidate,
  };
}
