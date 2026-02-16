import { useState, useCallback } from "react";
import { SessionBlockData } from "../types/usage-types";
import getBlocksUsage from "../tools/get-blocks-usage";
import { showToast, Toast } from "@raycast/api";
import { useInterval } from "usehooks-ts";
import { preferences } from "../preferences";

export function useBlocksUsage() {
  const [data, setData] = useState<SessionBlockData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const { customNpxPath, useDirectCcusageCommand } = preferences;

  const fetchData = useCallback(async () => {
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
  }, [customNpxPath, useDirectCcusageCommand]);

  useInterval(fetchData, 60000); // Refresh every minute for blocks

  // Initial fetch
  useState(() => {
    fetchData();
  });

  return {
    data,
    isLoading,
    error,
    revalidate: fetchData,
    lastFetched,
  };
}
