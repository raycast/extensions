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
} from "@/types";

export const useStats = () => {
  const url = `https://api.jsr.io/stats`;
  return useFetch<StatsData>(url);
};

export const usePackage = (item: NameAndScope | null) => {
  const url = `https://api.jsr.io/scopes/${item?.scope}/packages/${item?.name}`;
  return useFetch<Package>(url, { execute: !!item });
};

export const useVersions = (item: NameAndScope | null) => {
  const url = `https://api.jsr.io/scopes/${item?.scope}/packages/${item?.name}/versions`;
  return useFetch<VersionPackage[]>(url, { execute: !!item });
};

export const useScore = (item: NameAndScope | null) => {
  const url = `https://api.jsr.io/scopes/${item?.scope}/packages/${item?.name}/score`;
  return useFetch<PackageScore>(url, { execute: !!item });
};

export const useDependents = (item: NameAndScope | null) => {
  const url = `https://api.jsr.io/scopes/${item?.scope}/packages/${item?.name}/dependents?limit=100`;
  const { data, isLoading } = useFetch<ApiResults<Dependent>>(url, {
    execute: !!item,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onError(_) {},
  });
  const items = (data?.items || [])
    .map((item) => {
      return {
        ...item,
        key: `${item.scope}/${item.package}`,
      };
    })
    .filter((item, index, self) => self.findIndex((t) => t.key === item.key) === index);
  return {
    data: {
      total: data?.total || 0,
      items: items,
    } as ApiResults<Dependent & { key: string }>,
    isLoading,
  };
};

export const useDependencies = (item: NameAndScope | null, version: string | null) => {
  const url = `https://api.jsr.io/scopes/${item?.scope}/packages/${item?.name}/versions/${version}/dependencies?limit=100`;
  const { data, isLoading } = useFetch<Dependency[]>(url, {
    execute: !!item && !!version,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onError(_) {},
  });
  // Check if we have unique results based on dep.kind, dep.name, and dep.path combined
  const filteredData = (data || []).filter(
    (dep, index, self) =>
      self.findIndex((t) => t.kind === dep.kind && t.name === dep.name && t.path === dep.path) === index,
  );
  return {
    data: filteredData,
    isLoading,
  };
};

export const usePackages = (scope: string) => {
  const url = `https://api.jsr.io/scopes/${scope}/packages?limit=100`;
  return useFetch<ApiResults<Package>>(url);
};
