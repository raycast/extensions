import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../lib/query-client";
import type { Preferences } from "../../types";

/**
 * Custom hook for invalidating device-related queries in React Query cache
 *
 * This hook provides a centralized way to invalidate cached device data
 * when it becomes stale or needs to be refreshed. It's useful for
 * maintaining data consistency across the application.
 *
 * @returns Object containing functions to invalidate different types of device queries
 *
 * @remarks
 * - Provides granular control over which queries to invalidate
 * - Useful for maintaining data consistency after device operations
 * - Integrates with React Query's cache invalidation system
 * - Can be used to trigger background refetches of stale data
 * - Helps ensure UI displays the most up-to-date device information
 */
export function useInvalidateDeviceQueries() {
  const queryClient = useQueryClient();

  return {
    /**
     * Invalidates all device-related queries in the cache
     * Use this when you want to refresh all device data
     */
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.devices });
    },
    /**
     * Invalidates the devices list query for specific preferences
     * @param preferences - User preferences to target specific query
     */
    invalidateDevicesList: (preferences: Preferences) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.devicesList(preferences) });
    },
    /**
     * Invalidates the device state query for a specific device
     * @param deviceId - ID of the device whose state should be invalidated
     * @param preferences - User preferences to target specific query
     */
    invalidateDeviceState: (deviceId: string, preferences: Preferences) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deviceState(deviceId, preferences) });
    },
  };
}
