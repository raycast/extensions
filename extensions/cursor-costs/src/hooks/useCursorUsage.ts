import { useEffect, useCallback } from "react";
import { getPreferenceValues, showToast, Toast, environment, LaunchType } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { CursorUsageData, UsageSummary, CombinedUsageData, Preferences } from "../types";

// Helper to safely show toast (only in foreground mode)
function safeShowToast(options: Toast.Options): void {
  // Toast API is not available in background mode
  if (environment.launchType !== LaunchType.Background) {
    void showToast(options);
  }
}

// Common headers for API requests
function getHeaders(decodedToken: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Accept: "*/*",
    Cookie: `WorkosCursorSessionToken=${decodedToken}`,
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15",
    Origin: "https://cursor.com",
    Referer: "https://cursor.com/dashboard?tab=usage",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  };
}

// Fetch usage summary (billing cycle, limits, etc.)
async function fetchUsageSummary(decodedToken: string): Promise<UsageSummary> {
  const response = await fetch("https://cursor.com/api/usage-summary", {
    method: "GET",
    headers: getHeaders(decodedToken),
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error("Authentication token expired or invalid. Please update WorkOS Session Token in preferences.");
  }

  if (!response.ok) {
    throw new Error(`Usage Summary API Error: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as UsageSummary;
}

// Fetch aggregated usage events
async function fetchAggregatedUsage(
  decodedToken: string,
  startDate: number,
  endDate: number,
): Promise<CursorUsageData> {
  const requestData = {
    teamId: -1,
    startDate,
    endDate,
  };

  const response = await fetch("https://cursor.com/api/dashboard/get-aggregated-usage-events", {
    method: "POST",
    headers: getHeaders(decodedToken),
    body: JSON.stringify(requestData),
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error("Authentication token expired or invalid. Please update WorkOS Session Token in preferences.");
  }

  if (!response.ok) {
    throw new Error(`Aggregated Usage API Error: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as CursorUsageData;
}

// Get date range based on settings
function getDateRange(
  dateRangeSource: string | undefined,
  summary: UsageSummary | null,
): { startDate: number; endDate: number } {
  const endDate = Date.now();

  if (dateRangeSource === "billing" && summary) {
    // Use billing cycle dates
    const startDate = new Date(summary.billingCycleStart).getTime();
    return { startDate, endDate };
  }

  // Default: calendar month
  const startDate = new Date();
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);
  return { startDate: startDate.getTime(), endDate };
}

// Hook for fetching and caching data
export function useCursorUsage() {
  const preferences = getPreferenceValues<Preferences>();

  const fetchCombinedData = useCallback(async (): Promise<CombinedUsageData> => {
    if (!preferences.workosSessionToken) {
      throw new Error("WorkOS Session Token is not configured. Please add it in extension preferences.");
    }

    // Decode token if it's URL-encoded
    const decodedToken = decodeURIComponent(preferences.workosSessionToken);

    // First, fetch usage summary to get billing cycle info
    let summary: UsageSummary | null = null;
    try {
      summary = await fetchUsageSummary(decodedToken);
    } catch (error) {
      // If summary fails, we can still try to get usage data with calendar month
      console.error("Failed to fetch usage summary:", error);
    }

    // Get date range based on settings
    const { startDate, endDate } = getDateRange(preferences.dateRangeSource, summary);

    // Fetch aggregated usage with the determined date range
    const usage = await fetchAggregatedUsage(decodedToken, startDate, endDate);

    return { usage, summary };
  }, [preferences.workosSessionToken, preferences.dateRangeSource]);

  // Use caching with configurable interval
  const revalidationInterval = (Number(preferences.revalidationIntervalMinutes) || 1) * 60 * 1000; // in milliseconds

  const { data, error, isLoading, revalidate } = useCachedPromise(fetchCombinedData, [], {
    keepPreviousData: true,
  });

  // Configurable revalidation interval
  useEffect(() => {
    const interval = setInterval(() => {
      revalidate();
    }, revalidationInterval);

    return () => clearInterval(interval);
  }, [revalidate, revalidationInterval]);

  const refresh = useCallback(() => {
    safeShowToast({
      style: Toast.Style.Animated,
      title: "Refreshing data...",
    });
    revalidate();
  }, [revalidate]);

  return {
    data,
    error,
    isLoading,
    refresh,
  };
}
