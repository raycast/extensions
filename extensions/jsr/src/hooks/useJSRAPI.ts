import { useFetch } from "@raycast/utils";

import type {
  ApiResults,
  Dependency,
  Dependent,
  NameAndScope,
  Package,
  PackageScore,
  VersionPackage,
  VersionPackageBase,
} from "@/types";

export const useStats = () => {
  const url = `https://api.jsr.io/stats`;
  return useFetch<{
    newest: Array<Package>;
    updated: Array<VersionPackageBase>;
    featured: Array<Package>;
  }>(url);
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
  return {
    data: (data || { total: 0, items: [] }) as ApiResults<Dependent>,
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
  return {
    data: data || [],
    isLoading,
  };
};

export const usePackages = (scope: string) => {
  const url = `https://api.jsr.io/scopes/${scope}/packages?limit=100`;
  return useFetch<Package[]>(url);
};
