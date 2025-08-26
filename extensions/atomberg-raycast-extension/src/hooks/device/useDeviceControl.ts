import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showToast, Toast } from "@raycast/api";
import { apiServiceManager } from "../../services/api-service";
import { queryKeys } from "../../lib/query-client";
import { logger } from "../../utils/logger";
import type { Device, Preferences, DeviceCommand, DeviceState, CommandParameters } from "../../types";

/**
 * Custom hook for controlling Atomberg devices with comprehensive state management
 *
 * This hook provides device control functionality with automatic state updates,
 * user feedback through toast notifications, and intelligent query invalidation.
 * It handles both simple commands and complex parameterized operations.
 *
 * @param preferences - User preferences containing API credentials
 * @returns React Query mutation object with device control functionality
 *
 * @remarks
 * - Shows immediate feedback when command execution starts
 * - Invalidates and refetches device state after successful commands
 * - Includes a 1-second delay before refetching to ensure API state updates
 * - Provides comprehensive error handling with user-friendly messages
 * - Integrates with React Query for automatic state management
 */
export function useDeviceControl(preferences: Preferences) {
  const queryClient = useQueryClient();
  const apiService = apiServiceManager.getApiService(preferences);

  return useMutation({
    mutationFn: async ({
      device,
      command,
      deviceState,
      parameters,
    }: {
      device: Device;
      command: string | DeviceCommand;
      deviceState?: DeviceState;
      parameters?: CommandParameters;
    }) => {
      return apiService.controlDevice(device, command, deviceState, parameters);
    },
    onMutate: async ({
      device,
      command,
    }: {
      device: Device;
      command: string | DeviceCommand;
      deviceState?: DeviceState;
      parameters?: CommandParameters;
    }) => {
      // Show immediate feedback that command execution has started
      const commandName = typeof command === "string" ? command : command.command;
      showToast({
        title: "Executing Command",
        message: `Controlling ${device.name} - ${commandName}`,
        style: Toast.Style.Animated,
      });
    },
    onSuccess: async (
      success: boolean,
      {
        device,
      }: {
        device: Device;
        command: string | DeviceCommand;
        deviceState?: DeviceState;
        parameters?: CommandParameters;
      },
    ) => {
      if (success) {
        // Invalidate and refetch device state after a short delay to ensure API state is updated
        await queryClient.invalidateQueries({
          queryKey: queryKeys.deviceState(device.device_id, preferences),
        });

        // Force refetch after 1 second to ensure we get the updated state
        // This delay accounts for potential API latency in updating device state
        setTimeout(() => {
          queryClient.refetchQueries({
            queryKey: queryKeys.deviceState(device.device_id, preferences),
          });
        }, 1000);
      }
    },
    onError: (
      error: Error,
      {
        device,
        command,
      }: {
        device: Device;
        command: string | DeviceCommand;
        deviceState?: DeviceState;
        parameters?: CommandParameters;
      },
    ) => {
      const commandName = typeof command === "string" ? command : command.command;
      logger.error("Device control error:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Command Failed",
        message: `Failed to execute ${commandName} on ${device.name}`,
      });
    },
  });
}
