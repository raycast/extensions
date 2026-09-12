import { Common } from "@data/common";
import { TPackage, TPackageResponse } from "@data/types";
import { useFetch } from "@raycast/utils";
import { buildStr } from "@utils/str-utils";

export function usePackage(accountName: string, packageName: string, token: string) {
  const packageInfo: TPackage = {
    name: packageName,
    versions: [],
    modified: "",
  };
  if (!accountName || !packageName || !token) {
    return { isLoading: false, packageInfo, revalidate: () => {} };
  }

  const { isLoading, data, revalidate } = useFetch<string>(
    buildStr(Common.URL.Package, { org: accountName, package: packageName }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.npm.install-v1+json",
      },
    },
  );

  if (data) {
    const packageData = JSON.parse(data) as TPackageResponse;
    for (const [, info] of Object.entries(packageData.versions)) {
      packageInfo.versions = [info.version, ...packageInfo.versions];
    }
    packageInfo.modified = packageData.modified;
  }

  return { isLoading, packageInfo, revalidate };
}
