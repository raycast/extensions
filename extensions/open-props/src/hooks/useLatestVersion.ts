import { usePromise, withCache } from "@raycast/utils";

import { SupportedVersion } from "../lib/open-props/types";
import { fetchPackageVersion } from "../lib/unpkg";

const cachedFetchPackageVersion = withCache(async (version: SupportedVersion) => fetchPackageVersion(version), {
  maxAge: 1000 * 60 * 60 * 24, // 24h
});

export function useLatestVersion(majorVersion: SupportedVersion) {
  const {
    data: version,
    isLoading: isVersionLoading,
    error: versionError,
    revalidate: revalidateVersion,
  } = usePromise(() => cachedFetchPackageVersion(majorVersion));

  return { version, isVersionLoading, versionError, revalidateVersion };
}
