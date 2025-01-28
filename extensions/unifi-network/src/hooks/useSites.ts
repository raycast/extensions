import { useEffect } from "react";
import { UnifiClient } from "../lib/unifi/unifi";
import { useCachedPromise } from "@raycast/utils";

interface SitesHookProps {
  unifi: UnifiClient | undefined;
}

export function useSites({ unifi }: SitesHookProps) {
  const {
    isLoading,
    data: sites,
    revalidate,
    error,
  } = useCachedPromise(
    async () => {
      if (!unifi) {
        return [];
      }

      return await unifi.GetSites();
    },
    [],
    {
      initialData: [],
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    if (!unifi) {
      return;
    }

    revalidate();
  }, [unifi]);

  return { sites, error, isLoading, revalidate };
}
