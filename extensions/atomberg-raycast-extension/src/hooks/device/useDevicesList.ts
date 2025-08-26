import { useQuery } from "@tanstack/react-query";
import { apiServiceManager } from "../../services/api-service";
import { queryKeys } from "../../lib/query-client";
import type { Preferences } from "../../types";

/**
 * Custom hook for managing the list of Atomberg devices
 *
 * This hook provides device listing functionality with intelligent caching
 * and background management. It's optimized for device lists that don't
 * change frequently but need to be kept up-to-date.
 *
 * @param preferences - User preferences containing API credentials
 * @returns React Query result object with devices list data and state
 *
 * @remarks
 * - Only enabled when API credentials are provided
 * - Devices list is cached for 5 minutes (doesn't change often)
 * - Garbage collection occurs after 15 minutes of inactivity
 * - Does not refetch on window focus to reduce unnecessary API calls
 * - Optimized for static device lists with occasional updates
 */
export function useDevicesList(preferences: Preferences) {
  const apiService = apiServiceManager.getApiService(preferences);

  return useQuery({
    queryKey: queryKeys.devicesList(preferences),
    queryFn: () => apiService.fetchDevices(),
    enabled: !!(preferences.apiKey?.trim() && preferences.refreshToken?.trim()),
    staleTime: 5 * 60 * 1000, // 5 minutes - device list doesn't change often
    gcTime: 15 * 60 * 1000, // 15 minutes garbage collection
    refetchOnWindowFocus: false, // Don't refetch when switching windows
  });
}
