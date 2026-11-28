import { useCachedPromise } from "@raycast/utils";

import { Package } from "../helpers/package";
import { fetchPackageDownloadCount } from "../helpers/package-downloads";

/** No `keepPreviousData`: showing no number beats showing the previous package's. */
export function usePackageDownloadCount(pkg: Package | undefined) {
  return useCachedPromise((htmlUrl: string) => fetchPackageDownloadCount(htmlUrl), [pkg?.html_url ?? ""], {
    execute: pkg !== undefined,
  });
}
