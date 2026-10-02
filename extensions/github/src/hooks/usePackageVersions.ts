import { useCachedPromise } from "@raycast/utils";

import { getGitHubClient } from "../api/githubClient";
import { Package, PACKAGES_PER_PAGE, PackageType, PackageVersion } from "../helpers/package";

/** Paginated lazily: older versions stay reachable without fetching them up front. */
export function usePackageVersions(pkg: Package) {
  const { octokit } = getGitHubClient();

  return useCachedPromise(
    (packageType: PackageType, packageName: string) =>
      async ({ page }: { page: number }) => {
        const { data, headers } = await octokit.request("GET /user/packages/{package_type}/{package_name}/versions", {
          package_type: packageType,
          package_name: packageName,
          per_page: PACKAGES_PER_PAGE,
          page: page + 1,
        });

        return {
          data: data as unknown as PackageVersion[],
          hasMore: headers.link?.includes('rel="next"') ?? false,
        };
      },
    [pkg.package_type, pkg.name],
  );
}
