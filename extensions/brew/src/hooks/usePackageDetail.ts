/**
 * Hook for the per-package JSON from formulae.brew.sh.
 *
 * One fetch per selected row serves both the deprecation warning at the top of
 * the detail panel and the install statistics at the bottom — hence a hook
 * rather than a useFetch inside each of those components, which would request
 * the same ~5KB document twice.
 */

import { useFetch } from "@raycast/utils";
import { PackageDetailResponse, fetchLogger, packageAnalyticsURL } from "../utils";

/**
 * Fetch a package's API record.
 *
 * Gated on `isSelected`: Raycast constructs the detail element for every row in
 * the list, so an ungated fetch would fire once per visible result.
 */
export function usePackageDetail(name: string, isCask: boolean, isSelected: boolean) {
  const { data } = useFetch<PackageDetailResponse>(packageAnalyticsURL(name, isCask), {
    execute: isSelected,
    keepPreviousData: true,
    // This data is supplementary: log the failure, but don't interrupt the user
    // with a toast for rows that simply won't render.
    onError: (error) => {
      fetchLogger.error("Failed to fetch package detail", { name, error: error.message });
    },
  });

  return data;
}
