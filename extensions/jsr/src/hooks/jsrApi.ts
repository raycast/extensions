import { captureException } from "@raycast/api";
import { useCachedPromise, useFetch } from "@raycast/utils";

import type {
  ApiResults,
  Dependency,
  Dependent,
  NameAndScope,
  Package,
  PackageScore,
  StatsData,
  VersionPackage,
  WithKey,
} from "@/types";

/**
 * Shape returned by the trimmed `/stats` endpoint (post-2025 migration). Each
 * `newest` / `featured` item is just `{scope, name}`; the full `Package` shape
 * (with `runtimeCompat`, `description`, `score`, ...) must be fetched per item.
 */
type RawStatsData = {
  newest: NameAndScope[];
  featured: NameAndScope[];
};

const fetchPackage = async (scope: string, name: string): Promise<Package | null> => {
  try {
    const res = await fetch(`https://api.jsr.io/scopes/${scope}/packages/${name}`);
    if (!res.ok) {
      captureException(new Error(`Failed to fetch package @${scope}/${name}: ${res.status} ${res.statusText}`));
      return null;
    }
    return (await res.json()) as Package;
  } catch (err) {
    captureException(err);
    return null;
  }
};

/**
 * Stats data is used to display featured/newest packages on the main search table.
 *
 * The `/stats` endpoint now returns minimal stubs for newest/featured, so we
 * enrich each entry by fetching the full package metadata in parallel.
 *
 * @param {boolean} enabled - Whether to enable the stats data.
 */
export const useStats = (enabled = true) => {
  return useCachedPromise(
    async (): Promise<StatsData> => {
      const res = await fetch("https://api.jsr.io/stats");
      const raw = (await res.json()) as RawStatsData;

      const enrich = async (items: NameAndScope[]): Promise<Package[]> => {
        const results = await Promise.all(items.map((item) => fetchPackage(item.scope, item.name)));
        return results.filter((pkg): pkg is Package => pkg !== null);
      };

      const [newest, featured] = await Promise.all([enrich(raw.newest ?? []), enrich(raw.featured ?? [])]);

      return { newest, featured };
    },
    [],
    { execute: enabled, keepPreviousData: true },
  );
};

/**
 * This hook is used to get the package data.
 *
 * @param {NameAndScope | null} item - The package name and scope.
 */
export const usePackage = (item: NameAndScope | null) => {
  const url = `https://api.jsr.io/scopes/${item?.scope}/packages/${item?.name}`;
  return useFetch<Package>(url, { execute: !!item });
};

/**
 * This hook is used to get the package versions.
 *
 * @param {NameAndScope | null} item - The package name and scope.
 */
export const useVersions = (item: NameAndScope | null) => {
  const url = `https://api.jsr.io/scopes/${item?.scope}/packages/${item?.name}/versions`;
  return useFetch<VersionPackage[]>(url, { execute: !!item });
};

/**
 * This hook is used to get the package score.
 *
 * @param {NameAndScope | null} item - The package name and scope.
 */
export const useScore = (item: NameAndScope | null) => {
  const url = `https://api.jsr.io/scopes/${item?.scope}/packages/${item?.name}/score`;
  return useFetch<PackageScore>(url, { execute: !!item });
};

/**
 * This hook is used to get the package dependents.
 *
 * @param {NameAndScope | null} item - The package name and scope.
 */
export const useDependents = (item: NameAndScope | null) => {
  const url = `https://api.jsr.io/scopes/${item?.scope}/packages/${item?.name}/dependents?limit=100`;
  return useFetch<ApiResults<WithKey<Dependent>>>(url, {
    execute: !!item,
    onError(err) {
      captureException(err);
    },
    mapResult: (result) => {
      return {
        data: {
          total: result.total,
          items: result.items
            .map((item) => {
              return {
                ...item,
                key: `${item.scope}/${item.package}`,
              };
            })
            .filter((item, index, self) => self.findIndex((t) => t.key === item.key) === index),
        },
      };
    },
  });
};

/**
 * This hook is used to get the package dependencies.
 *
 * @param {NameAndScope | null} item - The package name and scope.
 * @param {string | null} version - The package version.
 */
export const useDependencies = (item: NameAndScope | null, version: string | null) => {
  const url = `https://api.jsr.io/scopes/${item?.scope}/packages/${item?.name}/versions/${version}/dependencies?limit=100`;
  return useFetch<Dependency[]>(url, {
    execute: !!item && !!version,
    onError(err) {
      captureException(err);
    },
    mapResult: (result) => {
      return {
        data: result.filter(
          (dep, index, self) =>
            self.findIndex((t) => t.kind === dep.kind && t.name === dep.name && t.path === dep.path) === index,
        ),
      };
    },
  });
};

/**
 * This hook is used to get the packages for a scope.
 *
 * @param {string} scope - The scope.
 */
export const usePackages = (scope: string) => {
  const url = `https://api.jsr.io/scopes/${scope}/packages?limit=100`;
  return useFetch<ApiResults<Package>>(url);
};
