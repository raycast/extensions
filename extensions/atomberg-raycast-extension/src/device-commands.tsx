import {
  List,
  Detail,
  ActionPanel,
  Action,
  Icon,
  getPreferenceValues,
  openExtensionPreferences,
  LaunchProps,
  useNavigation,
  Color,
} from "@raycast/api";
import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/query-client";
import { useDeviceState, useDeviceControl } from "./hooks";
import { hasValidCredentials } from "./utils/device-utils";
import { getIconFromString } from "./utils/icon-utils";
import type { Preferences, Device, DeviceCommandDefinition, CommandParameters } from "./types";
import { getAvailableCommandsForDevice, getCommandById } from "./config/device-commands";
import { SetTimerForm } from "./components/SetTimerForm";
import { SetSpeedForm } from "./components/SetSpeedForm";
import { showFailureToast } from "@raycast/utils";

interface DeviceCommandsArguments {
  deviceId: string;
  deviceName: string;
  deviceModel?: string;
  deviceSeries?: string;
}

function DeviceCommandsContent(
  props: LaunchProps<{ arguments: DeviceCommandsArguments }> | { arguments: DeviceCommandsArguments },
) {
  const { deviceId, deviceName, deviceModel, deviceSeries } = props.arguments;
  const preferences = getPreferenceValues<Preferences>();
  const { deviceState, isLoading, refreshDeviceState } = useDeviceState(deviceId, preferences);
  const deviceControlMutation = useDeviceControl(preferences);
  const [selectedCommand, setSelectedCommand] = useState<DeviceCommandDefinition | null>(null);
  const { push } = useNavigation();

  // Create a device object for command filtering
  const deviceMock: Device = {
    device_id: deviceId,
    name: deviceName,
    model: deviceModel || "Unknown",
    series: deviceSeries || "R1",
    color: "white",
    room: "Unknown",
    metadata: { ssid: "" },
  };

  const availableCommands = getAvailableCommandsForDevice(deviceMock);

  const credentialsValid = hasValidCredentials(preferences.apiKey, preferences.refreshToken);

  const executeCommand = async (command: DeviceCommandDefinition, parameters?: CommandParameters) => {
    if (!credentialsValid) {
      showFailureToast({
        title: "Authentication Required",
        message: "Please configure your API credentials",
      });
      return;
    }

    if (
      !deviceState &&
      (command.command === "toggle" || command.command === "sleep_mode" || command.command === "led_toggle")
    ) {
      showFailureToast({
        title: "Device State Required",
        message: "Please wait for device state to load before using toggle commands",
      });
      return;
    }

    const deviceMock: Partial<Device> = { device_id: deviceId, name: deviceName };
    deviceControlMutation.mutate(
      {
        device: deviceMock as Device,
        command: command.command,
        deviceState: deviceState || undefined,
        parameters,
      },
      {
        onSuccess: () => {
          // Additional device state refresh specifically for this component
          setTimeout(() => {
            refreshDeviceState();
          }, 1500);
        },
      },
    );
  };

  const handleSetSpeedSubmit = (values: { speedLevel: string }) => {
    const command = getCommandById("set-speed");
    if (command) {
      executeCommand(command, { speed_level: parseInt(values.speedLevel, 10) });
    }
  };

  const handleSetTimerSubmit = (values: { timerHours: string }) => {
    const command = getCommandById("set-timer");
    if (command) {
      executeCommand(command, { timer_hours: parseInt(values.timerHours, 10) });
    }
  };

  const handleCommandAction = (command: DeviceCommandDefinition) => {
    // Check if command has parameters - if so, show form
    if (command.parameters) {
      if (command.id === "set-speed") {
        push(<SetSpeedForm deviceName={deviceName} onSubmit={handleSetSpeedSubmit} />);
      } else if (command.id === "set-timer") {
        push(<SetTimerForm deviceName={deviceName} onSubmit={handleSetTimerSubmit} />);
      } else {
        // For other parametrized commands, execute directly for now
        executeCommand(command);
      }
    } else {
      // Execute simple commands directly
      executeCommand(command);
    }
  };

  const getDeviceStateMetadata = () => {
    if (!deviceState) return null;

    return (
      <Detail.Metadata>
        <Detail.Metadata.Label title="Device ID" text={deviceState.device_id} />

        <Detail.Metadata.TagList title="Status">
          <Detail.Metadata.TagList.Item
            text={deviceState.is_online ? "Online" : "Offline"}
            color={deviceState.is_online ? Color.Green : Color.Red}
          />
        </Detail.Metadata.TagList>

        <Detail.Metadata.TagList title="Power">
          <Detail.Metadata.TagList.Item
            text={deviceState.power ? "On" : "Off"}
            color={deviceState.power ? Color.Green : Color.Red}
          />
        </Detail.Metadata.TagList>

        <Detail.Metadata.TagList title="Speed">
          <Detail.Metadata.TagList.Item
            text={deviceState.last_recorded_speed === 0 ? "Off" : `Level ${deviceState.last_recorded_speed}`}
            color={deviceState.last_recorded_speed === 0 ? Color.SecondaryText : Color.Green}
          />
        </Detail.Metadata.TagList>

        {deviceState.timer_hours > 0 && (
          <>
            <Detail.Metadata.Label title="Timer Remaining" text={`${deviceState.timer_hours} hours`} />
            <Detail.Metadata.Label title="Timer Elapsed" text={`${deviceState.timer_time_elapsed_mins} minutes`} />
          </>
        )}

        {deviceState.last_recorded_brightness && (
          <Detail.Metadata.Label title="Brightness" text={deviceState.last_recorded_brightness.toString()} />
        )}

        {deviceState.last_recorded_color && (
          <Detail.Metadata.Label title="Color" text={deviceState.last_recorded_color} />
        )}

        <Detail.Metadata.Label
          title="Last Updated"
          text={new Date(deviceState.ts_epoch_seconds * 1000).toLocaleString()}
        />

        <Detail.Metadata.TagList title="Active Features">
          {deviceState.sleep_mode && (
            <Detail.Metadata.TagList.Item text="Sleep Mode" icon={Icon.Moon} color={Color.Blue} />
          )}
          {deviceState.led && <Detail.Metadata.TagList.Item text="LED" icon={Icon.LightBulb} color={Color.Purple} />}
          {!deviceState.sleep_mode && !deviceState.led && (
            <Detail.Metadata.TagList.Item text="None Active" color={Color.SecondaryText} />
          )}
        </Detail.Metadata.TagList>
      </Detail.Metadata>
    );
  };

  if (!credentialsValid) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Key}
          title="API Credentials Required"
          description="Please set your Atomberg API Key and Refresh Token in extension preferences"
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search device commands..."
      isShowingDetail={true}
      selectedItemId={selectedCommand?.id}
      onSelectionChange={(id) => {
        const command = getCommandById(id || "");
        setSelectedCommand(command || null);
      }}
      navigationTitle={`${deviceName} Controls`}
    >
      {availableCommands.map((command) => {
        const isToggleCommand =
          command.command === "toggle" || command.command === "sleep_mode" || command.command === "led_toggle";
        const isCommandDisabled = isLoading || (isToggleCommand && !deviceState) || deviceControlMutation.isPending;

        return (
          <List.Item
            key={command.id}
            id={command.id}
            title={command.title}
            subtitle={
              isCommandDisabled
                ? `${command.subtitle} ${isLoading ? "(Loading device state...)" : deviceControlMutation.isPending ? "(Executing...)" : "(Waiting for device state)"}`
                : command.subtitle
            }
            icon={getIconFromString(command.icon)}
            detail={<List.Item.Detail isLoading={isLoading} metadata={getDeviceStateMetadata()} />}
            actions={
              <ActionPanel>
                <Action
                  title={command.parameters ? `Configure: ${command.title}` : `Execute: ${command.title}`}
                  onAction={() => handleCommandAction(command)}
                  icon={getIconFromString(command.icon)}
                />
                <Action title="Refresh Device State" onAction={refreshDeviceState} icon={Icon.ArrowClockwise} />
                <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default function DeviceCommands(
  props: LaunchProps<{ arguments: DeviceCommandsArguments }> | { arguments: DeviceCommandsArguments },
) {
  return (
    <QueryClientProvider client={queryClient}>
      <DeviceCommandsContent {...props} />
    </QueryClientProvider>
  );
}
