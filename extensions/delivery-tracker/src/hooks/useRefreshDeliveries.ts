import { useState, useCallback, useMemo } from "react";
import { getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { Delivery } from "../types/delivery";
import { PackageMap } from "../types/package";
import { refreshTracking } from "../services/trackingService";

interface Preferences {
  refreshInterval: string;
}

export function useRefreshDeliveries(
  deliveries: Delivery[] | undefined,
  packages: PackageMap,
  setPackages: React.Dispatch<React.SetStateAction<PackageMap>>,
) {
  const [trackingIsLoading, setTrackingIsLoading] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useCachedState<number | null>("lastRefreshTime", null);

  const preferences = getPreferenceValues<Preferences>();
  const refreshIntervalMinutes = parseInt(preferences.refreshInterval || "30", 10);

  const handleRefresh = useCallback(
    async (forceRefresh: boolean = false) => {
      await refreshTracking(
        forceRefresh,
        deliveries,
        packages,
        setPackages,
        setTrackingIsLoading,
        refreshIntervalMinutes,
      );
      setLastRefreshTime(Date.now());
    },
    [deliveries, packages, setPackages, refreshIntervalMinutes, setLastRefreshTime],
  );

  // Check if we just refreshed (within 2 minutes)
  const justChecked = useMemo(() => {
    if (!lastRefreshTime) return false;
    const now = Date.now();
    const timeSinceRefresh = now - lastRefreshTime;
    return timeSinceRefresh <= 2 * 60 * 1000; // 2 minutes
  }, [lastRefreshTime]);

  const refreshTitle = justChecked ? "Refresh All (Just Checked!)" : "Refresh All";

  return {
    trackingIsLoading,
    handleRefresh,
    refreshTitle,
    refreshIntervalMinutes,
    justChecked,
  };
}
