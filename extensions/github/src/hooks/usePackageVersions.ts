import { useCachedPromise } from "@raycast/utils";

import { getGitHubClient } from "../api/githubClient";
import { Package, PACKAGES_PER_PAGE, PackageType, PackageVersion } from "../helpers/package";

/** One page is plenty; the `Link` header says whether more exist without fetching them. */
export function usePackageVersions(pkg: Package) {
  const { octokit } = getGitHubClient();

  return useCachedPromise(
    async (packageType: PackageType, packageName: string) => {
      const { data, headers } = await octokit.request("GET /user/packages/{package_type}/{package_name}/versions", {
        package_type: packageType,
        package_name: packageName,
        per_page: PACKAGES_PER_PAGE,
      });

      return {
        versions: data as unknown as PackageVersion[],
        hasMore: headers.link?.includes('rel="next"') ?? false,
      };
    },
    [pkg.package_type, pkg.name],
  );
}
