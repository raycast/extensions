import { useLocalStorage } from "@raycast/utils";
import Fuse from "fuse.js";
import { useCallback, useMemo, useState } from "react";
import type { Devices } from "../lib/unifi/types/device";
import type { Site } from "../lib/unifi/types/site";
import { UnifiClient } from "../lib/unifi/unifi";
import useUnifiResource from "./use-unifi-resource";
import useDevicePolling from "./use-device-polling";

interface DevicesHookProps {
  unifi: UnifiClient | undefined;
  search?: string;
}

export default function useDevices({ unifi, search }: DevicesHookProps) {
  const { isLoading: siteIsLoading } = useLocalStorage<Site>("selected-site", undefined);
  const [searchText, setSearchText] = useState(search || "");

  const handleError = useCallback((err: unknown) => {
    console.error("Devices Error:", err);
  }, []);

  const fetchDevices = useCallback(
    async (client: UnifiClient, abortable: AbortController) => {
      return client.GetDevicesFull(abortable);
    },
    [siteIsLoading],
  );

  const {
    data,
    isLoading: resourceLoading,
    error,
    fetchData,
  } = useUnifiResource<Devices>({
    unifi,
    fetchResource: fetchDevices,
    autoLoad: true,
  });

  const { pollingDeviceId, startPolling, stopPolling, pollDevices } = useDevicePolling(async (abortable) => {
    if (!unifi) return [];
    return unifi.GetDevicesFull(abortable);
  }, handleError);

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
    devices: filteredList,
    isLoading: siteIsLoading || resourceLoading,
    error,
    pollingDeviceId,
    searchText,
    pollDevices,
    startPolling,
    stopPolling,
    setSearchText,
    fetchData,
  };
}
