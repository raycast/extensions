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

/** What the detail panels need: the record, and whether fetching it failed. */
export interface PackageDetailState {
  data?: PackageDetailResponse;
  failed: boolean;
}

/**
 * Fetch a package's API record.
 *
 * Gated on `isSelected`: Raycast constructs the detail element for every row in
 * the list, so an ungated fetch would fire once per visible result.
 */
export function usePackageDetail(name: string, isCask: boolean, isSelected: boolean): PackageDetailState {
  const { data, error } = useFetch<PackageDetailResponse>(packageAnalyticsURL(name, isCask), {
    execute: isSelected,
    // Deliberately NOT keepPreviousData. These numbers render under a package
    // name, so stale data here is data attributed to the wrong package — the
    // one failure mode worth a flicker to avoid. Without it the statistics
    // simply aren't there until they load.
    // This data is supplementary: log the failure, but don't interrupt the user
    // with a toast for rows that simply won't render.
    onError: (error) => {
      fetchLogger.error("Failed to fetch package detail", { name, error: error.message });
    },
  });

  // `failed` is reported separately so the rows can distinguish a request that
  // failed from a package that genuinely reports no installs — both would
  // otherwise render as an em dash forever. It only counts as failed when
  // there is no data to show instead.
  return { data, failed: error != undefined && data == undefined };
}
