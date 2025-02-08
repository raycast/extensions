// External dependencies
import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useMemo, useState, useCallback } from "react";

// Types
import { useHarmony } from "../hooks/useHarmony";
import { Logger } from "../services/logger";
import { HarmonyDevice, HarmonyCommand } from "../types/harmony";
import { HarmonyStage } from "../types/harmony";

import { FeedbackState, ErrorStates, LoadingStates } from "./FeedbackState";

interface DeviceListProps {
  /** Optional filter for device types */
  deviceType?: string;
}

/**
 * DeviceList component displays a searchable list of Harmony devices and their commands.
 * Supports filtering and command execution.
 */
export function DeviceList({ deviceType }: DeviceListProps): JSX.Element {
  const { selectedHub, devices, error, loadingState, executeCommand } = useHarmony();
  const [searchText, setSearchText] = useState("");

  // Memoize filtered devices to prevent unnecessary recalculations
  const filteredDevices = useMemo(() => {
    let result = devices;

    if (deviceType) {
      result = result.filter((device) => device.type === deviceType);
    }

    if (searchText) {
      const searchLower = searchText.toLowerCase();
      result = result.filter(
        (device) =>
          device.name.toLowerCase().includes(searchLower) ||
          device.commands.some((cmd) => cmd.label.toLowerCase().includes(searchLower)),
      );
    }

    return result;
  }, [devices, deviceType, searchText]);

  // Memoize command handler to prevent recreation on each render
  const handleCommand = useCallback(
    async (device: HarmonyDevice, command: HarmonyCommand) => {
      try {
        await showToast({
          style: Toast.Style.Animated,
          title: `Sending command ${command.label} to ${device.name}`,
        });

        await executeCommand({
          id: command.id,
          name: command.name,
          label: command.label || command.name,
          deviceId: device.id,
          group: command.group || "IRCommand",
        });

        await showToast({
          style: Toast.Style.Success,
          title: "Command sent successfully",
        });
      } catch (error) {
        Logger.error("Failed to execute command", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to execute command",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [executeCommand],
  );

  if (!selectedHub) {
    return <FeedbackState {...ErrorStates.NO_HUB_SELECTED} />;
  }

  if (error) {
    return <FeedbackState {...ErrorStates.GENERAL_ERROR} error={error} />;
  }

  if (loadingState.stage === HarmonyStage.LOADING_DEVICES) {
    return <FeedbackState {...LoadingStates.LOADING_DEVICES} />;
  }

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isLoading={loadingState.stage !== HarmonyStage.CONNECTED}
      searchBarPlaceholder="Search devices and commands..."
    >
      {filteredDevices.map((device) => (
        <List.Item
          key={device.id}
          icon={Icon.Devices}
          title={device.name}
          subtitle={device.type}
          accessories={[{ text: `${device.commands.length} commands` }]}
          actions={
            <ActionPanel>
              {device.commands.map((command) => (
                <Action key={command.id} title={command.label} onAction={() => handleCommand(device, command)} />
              ))}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
