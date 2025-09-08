import { useDevicesList } from "./useDevicesList";
import { useDeviceControl } from "./useDeviceControl";
import { apiServiceManager } from "../../services/api-service";
import { logger } from "../../utils/logger";
import type { Device } from "../../types";

/**
 * Main hook for managing Atomberg devices and their control operations
 *
 * This hook combines device listing, state management, and control operations
 * into a single interface. It provides a comprehensive API for working with
 * Atomberg devices, including intelligent device toggling that fetches current
 * state before executing commands.
 *
 * @param preferences - User preferences containing API credentials
 * @returns Object containing devices data, loading states, and control functions
 *
 * @remarks
 * - Automatically fetches current device state before toggling for better UX
 * - Falls back to legacy behavior if state fetch fails
 * - Provides loading states for both device listing and control operations
 * - Integrates with React Query for automatic caching and background updates
 */
export function useAtombergDevices(preferences: Preferences) {
  const { data: devices = [], isLoading, refetch: refreshDevices, error } = useDevicesList(preferences);

  const deviceControlMutation = useDeviceControl(preferences);

  /**
   * Toggles the power state of a device with intelligent state management
   *
   * This function first fetches the current device state to ensure accurate
   * control, then executes the toggle command. If state fetching fails,
   * it falls back to the legacy behavior.
   *
   * @param device - The device to toggle
   * @throws Error if device state cannot be fetched and fallback fails
   */
  const toggleDevice = async (device: Device) => {
    try {
      // Fetch current device state first for better control accuracy
      const apiService = apiServiceManager.getApiService(preferences);
      const deviceState = await apiService.fetchDeviceState(device.device_id);

      if (deviceState) {
        deviceControlMutation.mutate({ device, command: "toggle", deviceState });
      } else {
        throw new Error("Failed to fetch device state");
      }
    } catch (error) {
      logger.error("Error toggling device:", error);
      // Fallback to old behavior if state fetch fails
      deviceControlMutation.mutate({ device, command: "toggle" });
    }
  };

  return {
    devices,
    isLoading,
    refreshDevices,
    toggleDevice,
    error,
    isControlling: deviceControlMutation.isPending,
  };
}
