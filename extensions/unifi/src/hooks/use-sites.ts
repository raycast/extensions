import { useLocalStorage } from "@raycast/utils";
import Fuse from "fuse.js";
import { useCallback, useMemo, useState } from "react";
import type { Site, Sites } from "../lib/unifi/types/site";
import { UnifiClient } from "../lib/unifi/unifi";
import useUnifiResource from "./use-unifi-resource";

interface DevicesHookProps {
  unifi: UnifiClient | undefined;
}

export default function useSites({ unifi }: DevicesHookProps) {
  const { value: selected, setValue, isLoading: siteIsLoading } = useLocalStorage<Site>("selected-site", undefined);
  const [searchText, setSearchText] = useState("");

  const fetchSites = useCallback(
    async (client: UnifiClient, abortable: AbortController) => {
      return client.GetSites(abortable);
    },
    [siteIsLoading],
  );

  const {
    data,
    isLoading: resourceLoading,
    error,
    fetchData,
  } = useUnifiResource<Sites>({
    unifi,
    fetchResource: fetchSites,
    autoLoad: true,
    requireSite: false, // Don't require site to be set for fetching sites list
  });

  const devices = useMemo(() => data || [], [data]);

  const fuseOptions = useMemo(
    () => ({
      keys: ["ipAddress", "name", "macAddress"],
      threshold: 0.3,
      includeScore: true,
    }),
    [],
  );

  const setSite = useCallback(
    (site: Site) => {
      console.log("Setting site", site);
      unifi?.SetSite(site.id);
      setValue(site);
    },
    [unifi, setValue],
  );

  const fuse = useMemo(() => new Fuse(devices, fuseOptions), [devices, fuseOptions]);

  const filteredList = useMemo(() => {
    if (!searchText) return devices;
    return fuse.search(searchText).map((res) => res.item);
  }, [searchText, devices, fuse]);

  return {
    sites: filteredList,
    isLoading: siteIsLoading || resourceLoading,
    error,
    selected,
    setSearchText,
    fetchData,
    setSite,
  };
}
