import { getApplications, Application } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { AppLookupMap, buildAppLookupMap } from "../utils";

/**
 * Get applications data, lookup map, and loading state.
 * The appMap is built once per data change for O(1) lookups.
 */
export function useApplicationsData(): {
  applications: Application[];
  appMap: AppLookupMap;
  isLoading: boolean;
} {
  const { data = [], isLoading } = useCachedPromise(getApplications, [], {
    keepPreviousData: true,
    failureToastOptions: { title: "Failed to load applications" },
  });
  const appMap = useMemo(() => buildAppLookupMap(data), [data]);
  return { applications: data, appMap, isLoading };
}
