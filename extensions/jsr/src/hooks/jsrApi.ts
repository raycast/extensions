import { useRef } from "react";

import { captureException } from "@raycast/api";
import { useCachedPromise, useFetch } from "@raycast/utils";

import type {
  ApiResults,
  Dependency,
  Dependent,
  DownloadsResponse,
  NameAndScope,
  Package,
  PackageScore,
  StatsData,
  VersionMeta,
  VersionPackage,
  WithKey,
} from "@/types";

import { onErrorCapture } from "@/lib/errors";
import { jsrUrls } from "@/lib/jsrUrls";

/**
 * Shape returned by the trimmed `/stats` endpoint (post-2025 migration). Each
 * `newest` / `featured` item is just `{scope, name}`; the full `Package` shape
 * (with `runtimeCompat`, `description`, `score`, ...) must be fetched per item.
 */
type RawStatsData = {
  newest: NameAndScope[];
  featured: NameAndScope[];
};

const fetchPackage = async (scope: string, name: string, signal?: AbortSignal): Promise<Package | null> => {
  try {
    const res = await fetch(jsrUrls.api.package(scope, name), { signal });
    if (!res.ok) {
      captureException(new Error(`Failed to fetch package @${scope}/${name}: ${res.status} ${res.statusText}`));
      return null;
    }
    return (await res.json()) as Package;
  } catch (err) {
    if ((err as Error).name === "AbortError") return null;
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
  const abortable = useRef<AbortController | null>(null);
  return useCachedPromise(
    async (): Promise<StatsData> => {
      const signal = abortable.current?.signal;
      const res = await fetch(jsrUrls.api.stats(), { signal });
      if (!res.ok) {
        throw new Error(`Failed to fetch JSR stats: ${res.status} ${res.statusText}`);
      }
      const raw = (await res.json()) as RawStatsData;

      const enrich = async (items: NameAndScope[]): Promise<Package[]> => {
        const results = await Promise.all(items.map((item) => fetchPackage(item.scope, item.name, signal)));
        return results.filter((pkg): pkg is Package => pkg !== null);
      };

      const [newest, featured] = await Promise.all([enrich(raw.newest ?? []), enrich(raw.featured ?? [])]);

      return { newest, featured };
    },
    [],
    {
      execute: enabled,
      keepPreviousData: true,
      abortable,
      onError: onErrorCapture,
      failureToastOptions: { title: "Error fetching JSR stats" },
    },
  );
};

/**
 * This hook is used to get the package data.
 *
 * @param {NameAndScope | null} item - The package name and scope.
 */
export const usePackage = (item: NameAndScope | null) => {
  const url = item ? jsrUrls.api.package(item.scope, item.name) : "";
  return useFetch<Package>(url, {
    execute: !!item,
    keepPreviousData: true,
    onError: onErrorCapture,
    failureToastOptions: { title: "Error fetching JSR package details" },
  });
};

/**
 * This hook is used to get the package versions.
 *
 * @param {NameAndScope | null} item - The package name and scope.
 */
export const useVersions = (item: NameAndScope | null) => {
  const url = item ? jsrUrls.api.versions(item.scope, item.name) : "";
  return useFetch<ApiResults<VersionPackage> | VersionPackage[], VersionPackage[], VersionPackage[]>(url, {
    execute: !!item,
    keepPreviousData: true,
    initialData: [] as VersionPackage[],
    onError: onErrorCapture,
    failureToastOptions: { title: "Error fetching JSR version data" },
    mapResult: (result) => {
      const items = Array.isArray(result) ? result : (result?.items ?? []);
      return { data: items };
    },
  });
};

/**
 * This hook is used to get the package score.
 *
 * @param {NameAndScope | null} item - The package name and scope.
 */
export const useScore = (item: NameAndScope | null) => {
  const url = item ? jsrUrls.api.score(item.scope, item.name) : "";
  return useFetch<PackageScore>(url, {
    execute: !!item,
    keepPreviousData: true,
    onError: onErrorCapture,
    failureToastOptions: { title: "Error fetching JSR package score" },
  });
};

/**
 * This hook is used to get the package dependents.
 *
 * @param {NameAndScope | null} item - The package name and scope.
 */
export const useDependents = (item: NameAndScope | null) => {
  const url = item ? jsrUrls.api.dependents(item.scope, item.name) : "";
  return useFetch<ApiResults<WithKey<Dependent>>>(url, {
    execute: !!item,
    keepPreviousData: true,
    onError: onErrorCapture,
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
  const url = item && version ? jsrUrls.api.dependencies(item.scope, item.name, version) : "";
  return useFetch<Dependency[]>(url, {
    execute: !!item && !!version,
    keepPreviousData: true,
    onError: onErrorCapture,
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
 * This hook is used to get the download stats for a package
 * (per-day buckets for ~last 90 days, plus per-recent-version breakdowns).
 *
 * @param {NameAndScope | null} item - The package name and scope.
 */
export const useDownloads = (item: NameAndScope | null) => {
  const url = item ? jsrUrls.api.downloads(item.scope, item.name) : "";
  return useFetch<DownloadsResponse>(url, {
    execute: !!item,
    keepPreviousData: true,
    onError: onErrorCapture,
    failureToastOptions: { title: "Error fetching JSR download stats" },
  });
};

/**
 * Fetch the per-version manifest from jsr.io (file sizes + checksums + exports map).
 * Served as a static CDN asset — cheap to fetch.
 */
export const useVersionMeta = (
  scope: string | undefined,
  name: string | undefined,
  version: string | null | undefined,
) => {
  const url = scope && name && version ? jsrUrls.site.versionMeta(scope, name, version) : "";
  return useFetch<VersionMeta>(url, {
    execute: !!scope && !!name && !!version,
    keepPreviousData: true,
    onError: onErrorCapture,
  });
};

/**
 * Fetch the raw README markdown for a package version from jsr.io. Only
 * packages whose `readmeSource` is "readme" (i.e. ship an actual README.md)
 * have content here; jsdoc-sourced packages return null.
 */
export const useReadme = (
  scope: string | undefined,
  name: string | undefined,
  version: string | null | undefined,
  readmePath: string | null | undefined,
) => {
  const url = scope && name && version && readmePath ? jsrUrls.site.readme(scope, name, version, readmePath) : "";
  return useFetch<string>(url, {
    execute: !!scope && !!name && !!version && !!readmePath,
    keepPreviousData: true,
    parseResponse: (r) => r.text(),
    onError: onErrorCapture,
  });
};

/**
 * This hook is used to get the packages for a scope.
 *
 * @param {string} scope - The scope.
 */
export const usePackages = (scope: string) => {
  const url = jsrUrls.api.scopePackages(scope);
  return useFetch<ApiResults<Package>>(url, {
    keepPreviousData: true,
    onError: onErrorCapture,
    failureToastOptions: { title: "Error fetching JSR scope packages" },
  });
};
