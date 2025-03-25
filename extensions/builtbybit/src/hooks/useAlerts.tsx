import { useState, useEffect, useCallback, useRef } from "react";
import { showFailureToast } from "@raycast/utils";
import { getPreferenceValues, Cache } from "@raycast/api";
import axios from "axios";
import { Alert } from "../types/alert";
import { ALERTS_CACHE_KEY } from "../utils/constants";
import Throttler from "../utils/throttler";
import { UserUtils } from "../utils/userUtils";

const apiKey = getPreferenceValues<{ apiKey: string }>().apiKey;
const throttler = new Throttler();
const cache = new Cache();

export function useAlerts(refreshKey: number) {
  const getCachedAlerts = () => {
    try {
      return JSON.parse(cache.get(ALERTS_CACHE_KEY) || "[]");
    } catch {
      return [];
    }
  };

  const [alerts, setAlerts] = useState<Alert[]>(getCachedAlerts());
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);
  const shouldFetchRef = useRef(refreshKey !== 0);

  const fetchAlerts = useCallback(async () => {
    console.log(`Fetch Alerts Called at ${new Date().toISOString()}`);
    console.log(`Current RefreshKey: ${refreshKey}`);
    console.log(`Should Fetch: ${shouldFetchRef.current}`);

    // Ensure we're still mounted and not rate limited
    if (!mountedRef.current || throttler.isRateLimited(false) || !shouldFetchRef.current) {
      console.warn("Fetch skipped");
      setIsLoading(false);
      return;
    }

    // Only set loading for explicit refresh
    if (refreshKey !== 0) {
      setIsLoading(true);
    }

    try {
      await throttler.stallIfRequired(false);

      const response = await axios.get("https://api.builtbybit.com/v1/alerts", {
        headers: { Authorization: `Private ${apiKey}` },
      });

      // Check if we're still mounted before processing
      if (!mountedRef.current) return;

      console.log("Fetched alerts data:", response.data);

      if (response.data && response.data.result === "success") {
        const fetchedAlerts = response.data.data;

        // If no alerts, clear the cache
        if (fetchedAlerts.length === 0) {
          cache.remove(ALERTS_CACHE_KEY);

          if (mountedRef.current) {
            setAlerts([]);
            setIsLoading(false);
          }
          return;
        }

        // Add usernames to new alerts
        const alertsWithUsernames = await Promise.all(
          fetchedAlerts.map(async (alert: Alert) => {
            try {
              // Only fetch username if not already present
              if (!alert.username) {
                const username = await UserUtils.IDToUsername(alert.caused_member_id.toString());
                console.log(`Fetched username for member ID ${alert.caused_member_id}: ${username}`);
                return {
                  ...alert,
                  username: username || "A user",
                };
              }
              return alert;
            } catch (usernameError) {
              console.error(`Error fetching username for ${alert.caused_member_id}:`, usernameError);
              return {
                ...alert,
                username: "A user",
              };
            }
          }),
        );

        // Create a set of content IDs for quick lookup
        const fetchedAlertIds = new Set(fetchedAlerts.map((alert: Alert) => alert.content_id));

        // Filter and update alerts
        const updatedAlerts = alertsWithUsernames.filter((alert) => fetchedAlertIds.has(alert.content_id));

        // Update cache and state
        cache.set(ALERTS_CACHE_KEY, JSON.stringify(updatedAlerts));

        // Only update state if still mounted
        if (mountedRef.current) {
          setAlerts(updatedAlerts);
          setIsLoading(false);
        }
      } else {
        throw new Error("Unexpected response structure");
      }
    } catch (error) {
      // Only update state if still mounted
      if (mountedRef.current) {
        console.error("Error fetching alerts:", error);
        showFailureToast("Failed to fetch alerts", { title: "Error fetching alerts" });
        setIsLoading(false);
      }
    } finally {
      // Reset should fetch for subsequent renders
      shouldFetchRef.current = false;
    }
  }, [refreshKey]);

  useEffect(() => {
    mountedRef.current = true;
    shouldFetchRef.current = refreshKey !== 0;

    // Only fetch if there's a reason to (manual refresh or first load)
    if (shouldFetchRef.current) {
      fetchAlerts();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [fetchAlerts, refreshKey]);

  return {
    alerts,
    isLoading,
    setAlerts: (newAlerts: Alert[]) => {
      // Update both state and cache when setting alerts
      cache.set(ALERTS_CACHE_KEY, JSON.stringify(newAlerts));
      setAlerts(newAlerts);
    },
    cache,
  };
}
