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
      // One registry failing shouldn't hide the rest, but the caller has to be able to
      // say so — a silently short list looks like packages were deleted.
      const results = await Promise.allSettled(PACKAGE_TYPES.map((type) => listPackagesOfType(octokit, type)));

      if (results.every((result) => result.status === "rejected")) {
        const rejected = results as PromiseRejectedResult[];

        if (rejected.some((result) => isMissingScopeError(result.reason))) {
          throw new MissingPackagesScopeError();
        }

        throw rejected[0].reason;
      }

      const packages = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
      const failedTypes = PACKAGE_TYPES.filter((_, index) => results[index].status === "rejected");

      return { packages: sortPackagesByUpdatedAt(packages), failedTypes };
    },
    [],
    { keepPreviousData: true },
  );
}
