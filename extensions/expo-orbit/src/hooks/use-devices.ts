import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { listDevices } from "../lib/devices";

const REFRESH_INTERVAL_MS = 5_000;

/**
 * Lists devices through Expo Orbit and refreshes them every few seconds while the view is open, so
 * simulators started or stopped elsewhere show their current state.
 */
export function useDevices() {
  const result = useCachedPromise(listDevices, [], {
    keepPreviousData: true,
    // Views show the error in place, and a toast every few seconds while polling would only get in the way.
    onError: () => undefined,
  });
  const { revalidate } = result;

  useEffect(() => {
    const timer = setInterval(revalidate, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [revalidate]);

  return result;
}
