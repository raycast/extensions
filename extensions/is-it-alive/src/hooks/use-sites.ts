import { useCallback } from "react";
import { useLocalStorage } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import type { MonitoredSite, SiteProvider } from "@/types";

const STORAGE_KEY = "sites";

export interface SiteInput {
  name: string;
  url: string;
  provider: SiteProvider;
  monitoredRegions?: string[];
}

function createId(): string {
  return randomUUID();
}

function toMonitoredSite(input: SiteInput): MonitoredSite {
  return {
    id: createId(),
    name: input.name,
    url: input.url,
    provider: input.provider,
    monitoredRegions: input.monitoredRegions,
    createdAt: new Date().toISOString(),
  };
}

export function useSites() {
  const {
    value: sites,
    setValue: setSites,
    isLoading,
  } = useLocalStorage<MonitoredSite[]>(STORAGE_KEY, []);

  const addSites = useCallback(
    async (inputs: SiteInput[]) => {
      if (inputs.length === 0) {
        return [];
      }

      const next = inputs.map(toMonitoredSite);
      await setSites([...(sites ?? []), ...next]);
      return next;
    },
    [setSites, sites],
  );

  const addSite = useCallback(
    async (input: SiteInput) => {
      const [next] = await addSites([input]);
      return next;
    },
    [addSites],
  );

  const updateSite = useCallback(
    async (id: string, input: SiteInput) => {
      await setSites(
        (sites ?? []).map((site) =>
          site.id === id
            ? {
                ...site,
                name: input.name,
                url: input.url,
                provider: input.provider,
                monitoredRegions: input.monitoredRegions,
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
    addSites,
    updateSite,
    deleteSite,
  };
}
