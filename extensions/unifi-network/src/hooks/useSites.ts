import { useLocalStorage } from "@raycast/utils";
import Fuse from "fuse.js";
import { useMemo, useState } from "react";
import type { Site, Sites } from "../lib/unifi/types/site";
import { UnifiClient } from "../lib/unifi/unifi";
import { useUnifiResource } from "./useUnifiResource";

interface DevicesHookProps {
  unifi: UnifiClient | undefined;
}

export default function useSites({ unifi }: DevicesHookProps) {
  const {
    value: selected,
    setValue: setSite,
    isLoading: siteIsLoading,
  } = useLocalStorage<Site>("selected-site", undefined);
  const [searchText, setSearchText] = useState("");

  const {
    data,
    isLoading: resourceLoading,
    error,
    fetchData,
  } = useUnifiResource<Sites>({
    unifi,
    siteIsLoading,
    async fetchResource(client, abortable) {
      return client.GetSites(abortable);
    },
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
