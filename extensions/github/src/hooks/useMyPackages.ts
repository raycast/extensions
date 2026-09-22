import { Octokit } from "@octokit/rest";
import { useCachedPromise } from "@raycast/utils";

import { getGitHubClient } from "../api/githubClient";
import {
  Package,
  PACKAGE_TYPES,
  PACKAGES_MAX_PAGES,
  PACKAGES_PER_PAGE,
  PackageType,
  sortPackagesByUpdatedAt,
} from "../helpers/package";

export const PACKAGES_SCOPE = "read:packages";

export class MissingPackagesScopeError extends Error {
  constructor() {
    super(`Your GitHub token is missing the "${PACKAGES_SCOPE}" scope.`);
    this.name = "MissingPackagesScopeError";
  }
}

function getResponseMessage(error: unknown): string {
  const octokitError = error as { message?: string; response?: { data?: { message?: string } } };

  return octokitError?.response?.data?.message ?? octokitError?.message ?? "";
}

/** An exhausted rate limit is also a 403, so only the message tells them apart. */
function isMissingScopeError(error: unknown): boolean {
  if ((error as { status?: number })?.status !== 403) {
    return false;
  }

  return getResponseMessage(error).toLowerCase().includes(PACKAGES_SCOPE);
}

async function listPackagesOfType(octokit: Octokit, packageType: PackageType): Promise<Package[]> {
  const packages: Package[] = [];

  for (let page = 1; page <= PACKAGES_MAX_PAGES; page++) {
    const { data } = await octokit.request("GET /user/packages", {
      package_type: packageType,
      per_page: PACKAGES_PER_PAGE,
      page,
    });

    packages.push(...(data as unknown as Package[]));

    if (data.length < PACKAGES_PER_PAGE) {
      break;
    }
  }

  return packages;
}

export function useMyPackages() {
  const { octokit } = getGitHubClient();

  return useCachedPromise(
    async () => {
      // A type the account never used can fail on its own, which shouldn't hide the rest.
      const results = await Promise.allSettled(PACKAGE_TYPES.map((type) => listPackagesOfType(octokit, type)));
      const fulfilled = results.filter((result) => result.status === "fulfilled");

      if (fulfilled.length === 0) {
        const rejected = results as PromiseRejectedResult[];

        if (rejected.some((result) => isMissingScopeError(result.reason))) {
          throw new MissingPackagesScopeError();
        }

        throw rejected[0].reason;
      }

      return sortPackagesByUpdatedAt(fulfilled.flatMap((result) => result.value));
    },
    [],
    { keepPreviousData: true },
  );
}
