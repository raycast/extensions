import { getApplications, Application } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { AppLookupMap, buildAppLookupMap } from "../utils";

/**
 * Shared hook for fetching applications with caching and error handling
 * Uses Raycast's built-in failureToastOptions for automatic error handling
 */
export function useApplications() {
  return useCachedPromise(getApplications, [], {
    keepPreviousData: true,
    failureToastOptions: {
      title: "Failed to load applications",
    },
  });
}

/**
 * Get applications data, lookup map, and loading state.
 * The appMap is built once per data change for O(1) lookups.
 * The raw applications array is still returned for form tag pickers.
 */
export function useApplicationsData(): {
  applications: Application[];
  appMap: AppLookupMap;
  isLoading: boolean;
} {
  const { data = [], isLoading } = useApplications();
  const appMap = useMemo(() => buildAppLookupMap(data), [data]);
  return { applications: data, appMap, isLoading };
}
