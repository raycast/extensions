import { useCachedPromise } from "@raycast/utils";
import { useCallback } from "react";
import type { ListDevice } from "../lib/unifi/types/device";
import { UnifiClient } from "../lib/unifi/unifi";

interface UseDeviceProps {
  deviceId: string;
  unifi: UnifiClient;
  devices: ListDevice[];
}

export function useDevice({ deviceId, unifi, devices }: UseDeviceProps) {
  const lookupDevice = useCallback(
    (id: string) => {
      return devices.find((device) => device.id === id);
    },
    [devices],
  );

  const { isLoading, data, revalidate, error } = useCachedPromise(
    async () => {
      try {
        const dev = await unifi.GetDevice(deviceId);
        if (!dev) return;

        if (dev.uplink?.deviceId) {
          const uplinkDevice = lookupDevice(dev.uplink.deviceId);
          if (uplinkDevice) {
            dev.uplink.deviceName = uplinkDevice.name;
          }
        }

        return dev;
      } catch (err) {
        console.error("Failed to fetch device:", err);
        return;
      }
    },
    [],
    {
      keepPreviousData: true,
    },
  );

  return {
    device: data,
    isLoading,
    error,
    revalidate,
  };
}
