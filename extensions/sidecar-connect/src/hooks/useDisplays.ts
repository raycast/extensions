import { useCallback } from "react";
import { usePromise } from "@raycast/utils";
import { discoverDevices } from "../lib/swift-bridge";
import { getStoredDevices } from "../lib/display-store";
import { SidecarDevice, StoredDevice } from "../lib/types";

export interface DisplayItem extends SidecarDevice {
  isFavorite: boolean;
  lastConnected?: number;
  source: "live" | "history";
}

export function useDisplays() {
  const {
    data: liveDevices,
    isLoading: isDiscovering,
    error: discoverError,
    revalidate: revalidateLive,
  } = usePromise(async () => {
    const devices = await discoverDevices();
    return devices as SidecarDevice[];
  });

  const { data: storedDevices, revalidate: revalidateStored } = usePromise(async () => {
    return await getStoredDevices();
  });

  const rescan = useCallback(() => {
    revalidateLive();
    revalidateStored();
  }, [revalidateLive, revalidateStored]);

  const refreshStored = useCallback(() => {
    revalidateStored();
  }, [revalidateStored]);

  // Merge live devices with stored history
  const displays: DisplayItem[] = [];
  const seenIds = new Set<string>();

  if (liveDevices) {
    for (const device of liveDevices) {
      const stored = storedDevices?.find((s: StoredDevice) => s.id === device.id || s.name === device.name);
      displays.push({
        ...device,
        isFavorite: stored?.isFavorite ?? false,
        lastConnected: stored?.lastConnected,
        source: "live",
      });
      seenIds.add(device.id);
    }
  }

  // Add historical devices not currently visible
  if (storedDevices) {
    for (const stored of storedDevices) {
      if (!seenIds.has(stored.id)) {
        displays.push({
          id: stored.id,
          name: stored.name,
          isConnected: false,
          isFavorite: stored.isFavorite,
          lastConnected: stored.lastConnected,
          source: "history",
        });
      }
    }
  }

  const connected = displays.filter((d) => d.isConnected);
  const available = displays.filter((d) => !d.isConnected && d.source === "live");
  const history = displays.filter((d) => !d.isConnected && d.source === "history");

  return {
    connected,
    available,
    history,
    all: displays,
    isLoading: isDiscovering,
    error: discoverError,
    rescan,
    refreshStored,
  };
}
