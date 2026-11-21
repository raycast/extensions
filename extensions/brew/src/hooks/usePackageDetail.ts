/**
 * Hook for the per-package JSON from formulae.brew.sh.
 *
 * One fetch per selected row serves both the deprecation warning at the top of
 * the detail panel and the install statistics at the bottom — hence a hook
 * rather than a useFetch inside each of those components, which would request
 * the same ~5KB document twice.
 */

import { useFetch } from "@raycast/utils";
import {
  type Cask,
  type Formula,
  PackageDetailResponse,
  fetchLogger,
  packageAnalyticsURL,
  thirdPartyTapOf,
} from "../utils";

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
 *
 * Never for a third-party tap's package. formulae.brew.sh publishes core and
 * cask only, and is keyed by SHORT name — so it would answer with a same-named
 * official package and show that package's Disabled or Deprecated warning on
 * the tapped one. Its data is also dropped, not just unfetched: useFetch caches
 * by URL, so a same-named core package fetched earlier would come back anyway.
 */
export function usePackageDetail(item: Cask | Formula, isSelected: boolean): PackageDetailState {
  const isCask = "token" in item;
  const name = isCask ? item.token : item.name;
  const thirdParty = thirdPartyTapOf(item) !== undefined;
  const { data, error } = useFetch<PackageDetailResponse>(packageAnalyticsURL(name, isCask), {
    execute: isSelected && !thirdParty,
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
  if (thirdParty) return { failed: false };
  return { data, failed: error != undefined && data == undefined };
}
