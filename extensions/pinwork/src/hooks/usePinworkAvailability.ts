/**
 * Hook to check Pinwork installation and running status.
 */

import { useCachedPromise, showFailureToast } from "@raycast/utils";
import { getPinworkAvailability } from "../api/pinwork";

const initialAvailability = { installed: false, running: false };

export function usePinworkAvailability() {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    getPinworkAvailability,
    [],
    {
      initialData: initialAvailability,
      onError: async (err) => {
        await showFailureToast(err, {
          title: "Unable to check Pinwork status",
        });
      },
    },
  );

  return {
    installed: data?.installed ?? false,
    running: data?.running ?? false,
    isReady: Boolean(data?.installed && data?.running),
    isLoading,
    error,
    revalidate,
  };
}
