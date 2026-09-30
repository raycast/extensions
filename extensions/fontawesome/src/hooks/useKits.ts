import { useCachedState, useFetch } from "@raycast/utils";
import type { Kit, KitsResult } from "@/types";
import { buildScopedCacheKey } from "@/utils/access-token";
import { filterKits } from "@/utils/kits";
import { kitsQuery } from "@/utils/query";

export const useKits = (accessToken: string, cacheScope: string, execute: boolean, kitFilter?: string) => {
  const [cachedKits, setCachedKits] = useCachedState<Kit[]>(buildScopedCacheKey("kits", cacheScope), []);

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
  return { kits: filterKits(allKits, kitFilter), isLoading, revalidate };
};
