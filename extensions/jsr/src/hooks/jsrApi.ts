import { useFetch } from "@raycast/utils";

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
 * Stats data is used to display featured/newest packages on the main search table
 *
 * @param {boolean} enabled - Whether to enable the stats data.
 */
export const useStats = (enabled = true) => {
  const url = `https://api.jsr.io/stats`;
  return useFetch<StatsData>(url, { execute: enabled });
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
    onError() {},
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
    onError() {},
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
