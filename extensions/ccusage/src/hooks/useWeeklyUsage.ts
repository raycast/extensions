import { useState, useEffect, useCallback } from "react";
import { WeeklyUsageData } from "../types/usage-types";
import getWeeklyUsage from "../tools/get-weekly-usage";
import { showToast, Toast } from "@raycast/api";
import { useInterval } from "usehooks-ts";
import { preferences } from "../preferences";

export function useWeeklyUsage() {
  const [data, setData] = useState<WeeklyUsageData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const { customNpxPath, useDirectCcusageCommand } = preferences;

  const fetchData = useCallback(async () => {
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
  }, [customNpxPath, useDirectCcusageCommand]);

  useInterval(fetchData, 300000); // Refresh every 5 minutes

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    revalidate: fetchData,
    lastFetched,
  };
}
