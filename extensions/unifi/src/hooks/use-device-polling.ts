import { useCallback, useState } from "react";
import type { Devices } from "../lib/unifi/types/device";
import useInterval from "./use-interval";

export default function useDevicePolling(
  fetchDevicesList: (abortable: AbortController) => Promise<Devices | undefined>,
  handleError: (err: unknown) => void,
) {
  const [pollingDeviceId, setPollingDeviceId] = useState<string | null>(null);

  const stopPolling = useCallback(() => {
    setPollingDeviceId(null);
  }, []);

  const pollDevices = useCallback(async () => {
    if (!pollingDeviceId) return;
    const abortController = new AbortController();
    try {
      const newDevices = await fetchDevicesList(abortController);
      const device = newDevices?.find((dev) => dev.id === pollingDeviceId);
      if (device && device.state === "ONLINE") {
        stopPolling();
        abortController.abort();
      }
    } catch (err) {
      handleError(err);
      abortController.abort();
    }
  }, [pollingDeviceId, fetchDevicesList, stopPolling, handleError]);

  const startPolling = useCallback(
    (deviceId: string) => {
      setPollingDeviceId(deviceId);
      pollDevices();
    },
    [pollDevices],
  );

  useInterval(pollDevices, pollingDeviceId ? 5000 : null);

  return { pollingDeviceId, setPollingDeviceId, pollDevices, startPolling, stopPolling };
}
