import { useLocalStorage } from "@raycast/utils";
import Fuse from "fuse.js";
import { useMemo, useState } from "react";
import type { Client } from "../lib/unifi/types/client";
import type { Site } from "../lib/unifi/types/site";
import { UnifiClient } from "../lib/unifi/unifi";
import { useUnifiResource } from "./useUnifiResource";
import { getPreferenceValues } from "@raycast/api";

interface UseClientsProps {
  unifi: UnifiClient | undefined;
  search?: string;
}

export function useClients({ unifi, search }: UseClientsProps) {
  const { groupClientsByOctet } = getPreferenceValues<Preferences.ViewClients>();
  const { isLoading: siteIsLoading } = useLocalStorage<Site>("selected-site", undefined);
  const [searchText, setSearchText] = useState(search || "");
  const [groupByOctet] = useState<number>(parseInt(groupClientsByOctet));

  const {
    data,
    isLoading: resourceLoading,
    error,
    fetchData,
  } = useUnifiResource<Client[]>({
    unifi,
    siteIsLoading,
    async fetchResource(client, abortable) {
      return client.GetClients(abortable);
    },
  });

  const clients = useMemo(() => data || [], [data]);

  const fuseOptions = useMemo(
    () => ({
      keys: ["ipAddress", "name", "macAddress"],
      threshold: 0.3,
      includeScore: true,
    }),
    [],
  );

  const fuse = useMemo(() => new Fuse(clients, fuseOptions), [clients, fuseOptions]);

  const filteredList = useMemo(() => {
    if (!searchText) return clients;
    return fuse.search(searchText).map((res) => res.item);
  }, [searchText, clients, fuse]);

  const groupedClients = useMemo(() => {
    if (groupByOctet === 0) return { "All Clients": filteredList };

    const grouped = filteredList.reduce(
      (acc, client) => {
        const parts = client.ipAddress?.split(".");
        const key = parts?.slice(0, groupByOctet).join(".")
          ? parts?.slice(0, groupByOctet).join(".") + ".*".repeat(4 - groupByOctet)
          : "Unknown";
        acc[key] = acc[key] || [];
        acc[key].push(client);
        return acc;
      },
      {} as Record<string, Client[]>,
    );

    const sortedGrouped = Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .reduce(
        (acc, key) => {
          acc[key] = grouped[key];
          return acc;
        },
        {} as Record<string, Client[]>,
      );

    return sortedGrouped;
  }, [filteredList, groupByOctet]);

  return {
    clients: groupedClients,
    isLoading: siteIsLoading || resourceLoading,
    error,
    searchText,
    setSearchText,
    fetchData,
  };
}
