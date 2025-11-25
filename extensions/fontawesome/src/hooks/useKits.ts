import { useCachedState, useFetch } from "@raycast/utils";
import type { Kit, KitsResult } from "@/types";
import { kitsQuery } from "@/utils/query";

export const useKits = (accessToken: string, execute: boolean, kitFilter?: string) => {
  const [cachedKits, setCachedKits] = useCachedState<Kit[]>("kits", []);

  const { isLoading, data, revalidate } = useFetch<KitsResult>("https://api.fontawesome.com", {
    execute: !!(accessToken && execute),
    keepPreviousData: true,
    method: "POST",
    body: kitsQuery(),
    onData: (result) => {
      const kits = result?.data?.me?.kits ?? [];
      setCachedKits(kits);
    },
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const allKits = (cachedKits && cachedKits.length > 0 ? cachedKits : data?.data?.me?.kits) ?? [];

  const trimmedFilter = kitFilter?.trim();
  let filteredKits: Kit[] = allKits;

  if (trimmedFilter && allKits.length > 0) {
    const tokensOrNames = trimmedFilter
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.toLowerCase());

    if (tokensOrNames.length > 0) {
      filteredKits = allKits.filter((kit) => {
        const nameLower = kit.name?.toLowerCase() ?? "";
        const tokenLower = kit.token?.toLowerCase() ?? "";
        const idLower = kit.id?.toLowerCase() ?? "";
        return tokensOrNames.some((value) => value === tokenLower || value === idLower || value === nameLower);
      });
    }
  }

  return { kits: filteredKits, isLoading, revalidate };
};
