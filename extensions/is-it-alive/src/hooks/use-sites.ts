import { useCallback, useRef } from "react";
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

type SiteMutation = (sites: MonitoredSite[]) => MonitoredSite[];

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
  const sitesRef = useRef(sites ?? []);
  const mutationQueue = useRef<Promise<void>>(Promise.resolve());
  sitesRef.current = sites ?? [];

  const mutateSites = useCallback(
    (mutation: SiteMutation): Promise<void> => {
      const operation = mutationQueue.current.then(async () => {
        const nextSites = mutation(sitesRef.current);
        await setSites(nextSites);
        sitesRef.current = nextSites;
      });

      // Keep later mutations running if one storage write fails.
      mutationQueue.current = operation.then(
        () => undefined,
        () => undefined,
      );
      return operation;
    },
    [setSites],
  );

  const addSites = useCallback(
    async (inputs: SiteInput[]) => {
      if (inputs.length === 0) {
        return [];
      }

      const addedSites = inputs.map(toMonitoredSite);
      await mutateSites((currentSites) => [...currentSites, ...addedSites]);
      return addedSites;
    },
    [mutateSites],
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
      await mutateSites((currentSites) =>
        currentSites.map((site) =>
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
    [mutateSites],
  );

  const deleteSite = useCallback(
    async (id: string) => {
      await mutateSites((currentSites) =>
        currentSites.filter((site) => site.id !== id),
      );
    },
    [mutateSites],
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
