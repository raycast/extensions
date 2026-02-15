import { useState, useCallback } from "react";
import { WeeklyUsageData } from "../types/usage-types";
import getWeeklyUsage from "../tools/get-weekly-usage";
import { showToast, Toast } from "@raycast/api";
import { useInterval } from "usehooks-ts";
import { useCCUsageAvailability } from "./useCCUsageAvailability";
import { usePreferences } from "./usePreferences";

export function useWeeklyUsage() {
  const { isAvailable, isLoading: isAvailabilityLoading, error: availabilityError } = useCCUsageAvailability();
  const [data, setData] = useState<WeeklyUsageData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const { customNpxPath, useDirectCcusageCommand } = usePreferences();

  const fetchData = useCallback(async () => {
    if (!isAvailable) return;

    try {
      const result = await getWeeklyUsage({
        customNpxPath,
        useDirectCcusageCommand,
      });
      setData(result);
      setError(undefined);
      setLastFetched(new Date());
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch weekly usage",
        message: errorObj.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, customNpxPath, useDirectCcusageCommand]);

  useInterval(fetchData, isAvailable ? 300000 : null); // Refresh every 5 minutes

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
