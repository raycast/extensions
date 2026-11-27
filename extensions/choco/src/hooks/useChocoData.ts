import { useCachedPromise, usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  fetchCommunityPackagesByIds,
  searchCommunityPackages,
} from "../choco/api";
import {
  listInstalledPackages,
  listOutdatedPackages,
  listSources,
  searchPackagesViaCli,
} from "../choco/cli";
import { getChocoPreferences } from "../choco/preferences";
import { ChocoPackage } from "../choco/types";

export function useInstalledPackages() {
  return useCachedPromise(listInstalledPackages, [], {
    keepPreviousData: true,
  });
}

export function useOutdatedPackages() {
  return useCachedPromise(listOutdatedPackages, [], {
    keepPreviousData: true,
  });
}

export function useChocoSources() {
  return useCachedPromise(listSources, [], {
    keepPreviousData: true,
  });
}

export function usePackageMetadataMap(packageIds: string[]) {
  const prefs = getChocoPreferences();
  const enabled = prefs.useCommunityApi && packageIds.length > 0;
  const key = packageIds
    .map((id) => id.toLowerCase())
    .sort()
    .join(",");

  return usePromise(
    async (idsKey: string) => {
      if (!idsKey) {
        return new Map<string, ChocoPackage>();
      }
      return fetchCommunityPackagesByIds(idsKey.split(","));
    },
    [key],
    { execute: enabled },
  );
}

export function useChocoSearch(rawQuery: string) {
  const prefs = getChocoPreferences();
  const [debouncedQuery, setDebouncedQuery] = useState(rawQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(rawQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [rawQuery]);

  return useCachedPromise(
    async (
      query: string,
      useApi: boolean,
      includePre: boolean,
    ): Promise<ChocoPackage[]> => {
      const trimmed = query.trim();
      if (useApi) {
        return searchCommunityPackages(trimmed, {
          top: 30,
          includePrerelease: includePre,
        });
      }
      if (!trimmed) {
        return [];
      }
      const cliResults = await searchPackagesViaCli(trimmed, includePre);
      return cliResults.map((item) => ({
        id: item.id,
        title: item.id,
        version: item.version,
        packageUrl: `https://community.chocolatey.org/packages/${encodeURIComponent(item.id)}`,
      }));
    },
    [debouncedQuery, prefs.useCommunityApi, prefs.includePrerelease],
    { keepPreviousData: true },
  );
}
