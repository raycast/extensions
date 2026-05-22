import { useCallback } from "react";
import { useLocalStorage } from "@raycast/utils";
import type { MonitoredSite, SiteProvider } from "@/types";

const STORAGE_KEY = "sites";

function createId(): string {
  return crypto.randomUUID();
}

export function useSites() {
  const {
    value: sites,
    setValue: setSites,
    isLoading,
  } = useLocalStorage<MonitoredSite[]>(STORAGE_KEY, []);

  const addSite = useCallback(
    async (input: { name: string; url: string; provider: SiteProvider }) => {
      const next: MonitoredSite = {
        id: createId(),
        name: input.name,
        url: input.url,
        provider: input.provider,
        createdAt: new Date().toISOString(),
      };

      await setSites([...(sites ?? []), next]);
      return next;
    },
    [setSites, sites],
  );

  const updateSite = useCallback(
    async (
      id: string,
      input: { name: string; url: string; provider: SiteProvider },
    ) => {
      await setSites(
        (sites ?? []).map((site) =>
          site.id === id
            ? {
                ...site,
                name: input.name,
                url: input.url,
                provider: input.provider,
              }
            : site,
        ),
      );
    },
    [setSites, sites],
  );

  const deleteSite = useCallback(
    async (id: string) => {
      await setSites((sites ?? []).filter((site) => site.id !== id));
    },
    [setSites, sites],
  );

  return {
    sites: sites ?? [],
    isLoading,
    addSite,
    updateSite,
    deleteSite,
  };
}
