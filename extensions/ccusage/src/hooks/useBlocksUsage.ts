import { useState, useCallback } from "react";
import { SessionBlockData } from "../types/usage-types";
import getBlocksUsage from "../tools/get-blocks-usage";
import { showToast, Toast } from "@raycast/api";
import { useInterval } from "usehooks-ts";
import { useCCUsageAvailability } from "./useCCUsageAvailability";
import { usePreferences } from "./usePreferences";

export function useBlocksUsage() {
  const { isAvailable, isLoading: isAvailabilityLoading, error: availabilityError } = useCCUsageAvailability();
  const [data, setData] = useState<SessionBlockData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const { customNpxPath, useDirectCcusageCommand } = usePreferences();

  const fetchData = useCallback(async () => {
    if (!isAvailable) return;

    try {
      // Fetch recent blocks (last 3 days) to be more useful in the UI
      const result = await getBlocksUsage({
        customNpxPath,
        useDirectCcusageCommand,
        recent: true,
      });
      setData(result);
      setError(undefined);
      setLastFetched(new Date());
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch session blocks",
        message: errorObj.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, customNpxPath, useDirectCcusageCommand]);

  useInterval(fetchData, isAvailable ? 60000 : null); // Refresh every minute for blocks

  // Initial fetch
  useState(() => {
    if (isAvailable) {
      fetchData();
    } else if (!isAvailabilityLoading && availabilityError) {
      setIsLoading(false);
      setError(availabilityError);
    }
  });

  return {
    data,
    isLoading: isLoading || isAvailabilityLoading,
    error: error || availabilityError,
    revalidate: fetchData,
    lastFetched,
  };
}
