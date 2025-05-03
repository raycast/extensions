import { useFetch } from "@raycast/utils";
import { buildStr } from "@utils/str-utils";
import { Common } from "@data/common";

export function usePackages(accountName: string, token: string) {
  if (!accountName || !token) {
    return { isLoading: false, packages: [], revalidate: () => {} };
  }

  const { isLoading, data, revalidate } = useFetch<string[]>(buildStr(Common.URL.PackagesInOrg, { org: accountName }), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  let packages: string[] = [];
  if (data) {
    packages = Object.keys(data);
  }

  return { isLoading, packages, revalidate };
}
