import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import Fuse from "fuse.js";
import { useEffect, useState } from "react";
import type { Clients } from "../lib/unifi/types/client";
import type { Site } from "../lib/unifi/types/site";
import { UnifiClient } from "../lib/unifi/unifi";
import { useSiteCheck } from "./useSiteCheck";

interface ClientsHookProps {
  unifi: UnifiClient | undefined;
}

export function useClients({ unifi }: ClientsHookProps) {
  const { value: site, isLoading: siteIsLoading } = useLocalStorage<Site>("selected-site", undefined);
  const [searchText, setSearchText] = useState("");

  const {
    isLoading,
    data: clients,
    revalidate,
    error,
  } = useCachedPromise(
    async () => {
      if (!unifi || !site || siteIsLoading) {
        return [];
      }

      return await unifi.GetClients();
    },
    [],
    {
      initialData: [] as Clients,
    },
  );

  const [filteredList, filterList] = useState<Clients>(clients);

  useSiteCheck({ unifi, site, siteIsLoading, onRevalidate: revalidate });

  useEffect(() => {
    // used because it allows partial filtering of ips and mac addresses
    const fuseOptions = {
      keys: ["ipAddress", "name", "macAddress"],
      threshold: 0.3,
      includeScore: true,
    };

    const fuse = new Fuse(clients, fuseOptions);

    if (searchText) {
      const results = fuse.search(searchText);
      filterList(results.map((result) => result.item));
    } else {
      filterList(clients);
    }
  }, [searchText, clients]);

  const isLoadingFull = siteIsLoading || isLoading;

  return {
    clients: filteredList,
    isLoading: isLoadingFull,
    error,
    setSearchText,
    revalidate,
  };
}
