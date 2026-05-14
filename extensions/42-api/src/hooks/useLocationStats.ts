/**
 * Hook for fetching 42 location statistics
 */

import { useMemo } from "react";
import { useFetch } from "@raycast/utils";
import { useAuth } from "./useAuth";
import { LocationStats, DateRange } from "../lib/types";
import { getDateRange, parseTime, calculateTotalSeconds, formatDuration, sortDatesDescending } from "../lib/utils";
import { API_BASE_URL } from "../lib/constants";

export interface UseLocationStatsOptions {
  /** Number of days to look back (default: 0 for today only) */
  daysBack?: number;
  /** Custom date range (overrides daysBack) */
  dateRange?: DateRange;
  /** Execute the fetch only when this is true */
  execute?: boolean;
  /** Suppress error toasts (useful for background mode) */
  suppressToasts?: boolean;
}

export interface UseLocationStatsReturn {
  stats: LocationStats | undefined;
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
  // Computed values for convenience
  sortedDates: string[];
  todayLogtime: string | null;
  todayLogtimeSeconds: number;
  totalTime: string;
  totalSeconds: number;
}

export function useLocationStats(
  userId: number | null | undefined,
  options: UseLocationStatsOptions = {},
): UseLocationStatsReturn {
  const { daysBack = 0, dateRange: customDateRange, execute = true, suppressToasts = false } = options;
  const { accessToken, isAuthenticating } = useAuth();

  // Calculate date range
  const dateRange = useMemo(() => {
    return customDateRange || getDateRange(daysBack);
  }, [customDateRange, daysBack]);

  const url = useMemo(() => {
    if (!userId || !accessToken || isAuthenticating) return API_BASE_URL;
    return `${API_BASE_URL}/users/${userId}/locations_stats?begin_at=${dateRange.beginAt}&end_at=${dateRange.endAt}`;
  }, [userId, accessToken, isAuthenticating, dateRange]);

  const {
    data: stats,
    isLoading,
    error,
    revalidate,
  } = useFetch<LocationStats>(url, {
    headers: {
      Authorization: `Bearer ${accessToken || ""}`,
      "Content-Type": "application/json",
    },
    execute: execute && !!userId && !!accessToken && !isAuthenticating,
    keepPreviousData: true,
    failureToastOptions: suppressToasts
      ? { title: "" }
      : {
          title: "Failed to fetch location stats",
          message: `Could not load logtime data for user ID ${userId}`,
        },
  });

  // Compute derived values
  const sortedDates = useMemo(() => {
    if (!stats) return [];
    return sortDatesDescending(Object.keys(stats));
  }, [stats]);

  const todayLogtime = useMemo(() => {
    if (!stats) return null;
    const todayStr = dateRange.beginAt; // For single-day queries, beginAt is today
    return todayStr in stats ? stats[todayStr] : null;
  }, [stats, dateRange]);

  const todayLogtimeSeconds = useMemo(() => {
    if (!todayLogtime) return 0;
    return parseTime(todayLogtime).totalSeconds;
  }, [todayLogtime]);

  const totalSeconds = useMemo(() => {
    if (!stats) return 0;
    return calculateTotalSeconds(stats);
  }, [stats]);

  const totalTime = useMemo(() => {
    return formatDuration(totalSeconds);
  }, [totalSeconds]);

  return {
    stats,
    isLoading: isLoading || isAuthenticating,
    error,
    revalidate,
    sortedDates,
    todayLogtime,
    todayLogtimeSeconds,
    totalTime,
    totalSeconds,
  };
}
