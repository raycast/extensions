import { useQuery } from "@tanstack/react-query";
import { apiServiceManager } from "../../services/api-service";
import { queryKeys } from "../../lib/query-client";

/**
 * Custom hook for managing individual device state with real-time updates
 *
 * This hook provides real-time device state management with intelligent
 * caching, background refetching, and focus-based updates. It's optimized
 * for devices that need frequent state monitoring.
 *
 * @param deviceId - Unique identifier of the device to monitor
 * @param preferences - User preferences containing API credentials
 * @returns Object containing device state, loading states, and refresh functions
 *
 * @remarks
 * - Only enabled when device ID and credentials are provided
 * - State is considered stale after 10 seconds for real-time accuracy
 * - Automatically refetches every 30 seconds in the background
 * - Refetches when window gains focus for up-to-date information
 * - Optimized for devices that need frequent state monitoring
 */
export function useDeviceState(deviceId: string, preferences: Preferences) {
  const apiService = apiServiceManager.getApiService(preferences);

  const {
    data: deviceState,
    isLoading,
    refetch: refreshDeviceState,
    error,
  } = useQuery({
    queryKey: queryKeys.deviceState(deviceId, preferences),
    queryFn: () => apiService.fetchDeviceState(deviceId),
    enabled: !!(deviceId && preferences.apiKey?.trim() && preferences.refreshToken?.trim()),
    staleTime: 10 * 1000, // 10 seconds - device state should be fresh
    refetchInterval: 30 * 1000, // Background refetch every 30 seconds
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true, // Refetch when user focuses the window
  });

  return {
    deviceState: deviceState || null,
    isLoading,
    refreshDeviceState,
    error,
  };
}
