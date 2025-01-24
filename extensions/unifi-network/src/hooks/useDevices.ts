import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import Fuse from "fuse.js";
import { useEffect, useState } from "react";
import type { ListDevices } from "../lib/unifi/types/device";
import type { Site } from "../lib/unifi/types/site";
import { UnifiClient } from "../lib/unifi/unifi";
import { useSiteCheck } from "./useSiteCheck";

interface DevicesHookProps {
  unifi: UnifiClient | undefined;
}

export function useDevices({ unifi }: DevicesHookProps) {
  const { value: site, isLoading: siteIsLoading } = useLocalStorage<Site>("selected-site", undefined);
  const [searchText, setSearchText] = useState("");

  const {
    isLoading,
    data: devices,
    revalidate,
    error,
  } = useCachedPromise(
    async () => {
      if (!unifi || siteIsLoading) {
        return [];
      }

      return await unifi.GetDevices();
    },
    [],
    {
      initialData: [] as ListDevices,
      keepPreviousData: true,
    },
  );

  const [filteredList, filterList] = useState<ListDevices>(devices);

  useSiteCheck({ unifi, site, siteIsLoading, onRevalidate: revalidate });

  useEffect(() => {
    // used because it allows partial filtering of ips and mac addresses
    const fuseOptions = {
      keys: ["ipAddress", "name", "macAddress"],
      threshold: 0.3,
      includeScore: true,
    };

    const fuse = new Fuse(devices, fuseOptions);

    if (searchText) {
      const results = fuse.search(searchText);
      filterList(results.map((result) => result.item));
    } else {
      filterList(devices);
    }
  }, [searchText, devices]);

  const lookupDevice = (deviceId: string) => {
    return devices.find((device) => device.id === deviceId);
  };

  const isLoadingFull = siteIsLoading || isLoading;

  return {
    devices: filteredList,
    isLoading: isLoadingFull,
    error,
    setSearchText,
    revalidate,
    lookupDevice,
  };
}
