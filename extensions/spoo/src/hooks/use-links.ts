import { useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import { listUrls, type ListUrlsOptions } from "@/api/urls";
import { CACHE_KEYS } from "@/constants";
import { readCached, writeCached } from "@/lib/cache";
import type { UrlListItem, UrlListResponse } from "@/schemas/url";

interface UseLinksResult {
  links: UrlListItem[];
  total: number;
  hasNext: boolean;
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
  mutate: (
    updater: Promise<unknown>,
    opts?: {
      optimisticUpdate?: (
        current: UrlListResponse | undefined,
      ) => UrlListResponse;
      rollbackOnError?: boolean;
    },
  ) => Promise<unknown>;
}

function getInitialData(): UrlListResponse | undefined {
  return readCached<UrlListResponse>(CACHE_KEYS.links);
}

async function fetchLinks(options: ListUrlsOptions): Promise<UrlListResponse> {
  const result = await listUrls(options);
  // Only persist the default query (unfiltered list) to shared cache so other
  // commands read a consistent snapshot.
  if (!options.search && !options.status && (options.page ?? 1) === 1) {
    writeCached(CACHE_KEYS.links, result);
  }
  return result;
}

export function useLinks(options: ListUrlsOptions = {}): UseLinksResult {
  const key = useMemo(() => JSON.stringify(options), [options]);
  const { data, isLoading, error, revalidate, mutate } = useCachedPromise(
    async (serialized: string) =>
      fetchLinks(JSON.parse(serialized) as ListUrlsOptions),
    [key],
    {
      initialData: getInitialData(),
      keepPreviousData: true,
    },
  );

  return {
    links: data?.items ?? [],
    total: data?.total ?? 0,
    hasNext: data?.hasNext ?? false,
    isLoading,
    error,
    revalidate,
    mutate,
  };
}
