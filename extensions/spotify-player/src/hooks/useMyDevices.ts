import { useRef, useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { getMyDevices } from "../api/getMyDevices";
import { transferMyPlayback } from "../api/transferMyPlayback";

type UseMyDevicesProps = {
  options?: {
    execute?: boolean;
  };
};

type Devices = Awaited<ReturnType<typeof getMyDevices>>;

// The list with only this device active.
const withActive = (data: Devices, deviceId: string): Devices => ({
  ...data,
  devices: data.devices?.map((device) => ({ ...device, is_active: device.id === deviceId })),
});

// A read of the list: Spotify's answer as soon as it comes, before it shows, or that it failed.
type Read = { answer?: Devices; failed?: boolean };

export function useMyDevices({ options }: UseMyDevicesProps = {}) {
  const lastRead = useRef<Read>({});
  // Until Spotify answers, the last list shows.
  const { data, error, isLoading, revalidate, mutate } = useCachedPromise(
    () => {
      const read: Read = (lastRead.current = {});
      return getMyDevices().then(
        (devices) => {
          read.answer = devices;
          return devices;
        },
        (err) => {
          read.failed = true;
          throw err;
        },
      );
    },
    [],
    {
      execute: options?.execute !== false,
    },
  );

  // The device being moved to shows as active until the move ends.
  const [moving, setMoving] = useState<{ deviceId: string }>();

  async function connect(deviceId: string, play?: boolean) {
    const choice = { deviceId };
    setMoving(choice);
    try {
      await transferMyPlayback(deviceId, play);
      // Then the list shows it, including the next time it opens, without asking Spotify again: right after a move,
      // it may still report the device playback left. A read under way is asked again, and its answer shows instead.
      // Unless the last read failed, or Spotify's answer to it doesn't have the device.
      const { answer, failed } = lastRead.current;
      const unlisted = !!answer && !answer.devices?.some((device) => device.id === deviceId);
      await mutate(undefined, {
        optimisticUpdate: (data) => {
          const latest = answer ?? data;
          return latest && withActive(latest, deviceId);
        },
        shouldRevalidateAfter: failed || unlisted,
      });
    } finally {
      // Unless another device was chosen since. After a failed move, the device shown before it shows again.
      setMoving((current) => (current === choice ? undefined : current));
    }
  }

  return {
    myDevicesData: data && moving ? withActive(data, moving.deviceId) : data,
    myDevicesError: error,
    myDevicesIsLoading: isLoading,
    myDevicesRevalidate: revalidate,
    myDevicesConnect: connect,
  };
}
