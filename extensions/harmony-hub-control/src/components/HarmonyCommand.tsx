import { List, Icon, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { useHarmony } from "../hooks/useHarmony";
import { HarmonyDevice, HarmonyActivity, HarmonyHub, HarmonyStage } from "../types/harmony";
import type { HarmonyCommand } from "../types/harmony";
import { Logger } from "../services/logger";
import { FeedbackState } from "./FeedbackState";
import { Preferences } from "../types/preferences";

/**
 * HarmonyCommand component provides a unified interface for controlling Harmony devices and activities.
 * Supports searching, filtering, and executing commands.
 */
export function HarmonyCommand(): JSX.Element {
  const {
    hubs,
    selectedHub,
    devices,
    activities,
    currentActivity,
    error,
    loadingState,
    connect,
    refresh,
    executeCommand,
    clearCache,
    startActivity,
    stopActivity,
  } = useHarmony();

  const [searchText, setSearchText] = useState("");
  const preferences = getPreferenceValues<Preferences>();
  const defaultView = preferences.defaultView || "devices";
  const [view, setView] = useState<"hubs" | "activities" | "devices" | "commands">(selectedHub ? defaultView : "hubs");
  const [selectedDevice, setSelectedDevice] = useState<HarmonyDevice | null>(null);

  // Start discovery on mount
  useEffect(() => {
    refresh().catch((error) => {
      Logger.error("Failed to refresh:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to discover hubs",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    });
  }, [refresh]);

  // Reset to hub selection if no hub is selected
  useEffect(() => {
    if (!selectedHub && view !== "hubs") {
      setView("hubs");
    }
  }, [selectedHub, view]);

  // Get icon for command based on its label
  const getCommandIcon = (label: string): Icon => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes("power")) return Icon.Power;
    if (lowerLabel.includes("volume")) return Icon.SpeakerHigh;
    if (lowerLabel.includes("mute")) return Icon.SpeakerOff;
    if (lowerLabel.includes("play")) return Icon.Play;
    if (lowerLabel.includes("pause")) return Icon.Pause;
    if (lowerLabel.includes("stop")) return Icon.Stop;
    if (lowerLabel.includes("forward")) return Icon.Forward;
    if (lowerLabel.includes("back")) return Icon.Rewind;
    if (lowerLabel.includes("input")) return Icon.Link;
    if (lowerLabel.includes("menu")) return Icon.List;
    return Icon.Circle;
  };

  // Filter and sort devices based on search
  const filteredDevices =
    devices
      ?.filter(
        (device) =>
          device.name.toLowerCase().includes(searchText.toLowerCase()) ||
          device.commands.some((cmd) => cmd.name.toLowerCase().includes(searchText.toLowerCase())),
      )
      .sort((a, b) => a.name.localeCompare(b.name)) || [];

  // Filter and sort activities based on search
  const filteredActivities =
    activities
      ?.filter((activity) => activity.name.toLowerCase().includes(searchText.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name)) || [];

  // Handle hub selection
  const handleHubSelect = async (hub: HarmonyHub) => {
    try {
      await connect(hub);
      setView(defaultView);
      setSearchText("");
    } catch (error) {
      Logger.error("Failed to connect to hub:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to connect",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Handle command execution
  const handleCommand = async (command: {
    name: string;
    deviceId: string;
    id: string;
    group?: string;
    label?: string;
  }) => {
    try {
      Logger.debug("Executing command:", {
        command,
        device: selectedDevice?.name,
        deviceId: selectedDevice?.id,
      });
      await executeCommand({
        name: command.name,
        deviceId: command.deviceId,
        id: command.id,
        label: command.label || command.name,
        group: command.group || "IRCommand",
      });
      showToast({
        style: Toast.Style.Success,
        title: "Command sent",
        message: command.name,
      });
    } catch (error) {
      Logger.error("Failed to execute command:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Command failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleActivity = async (activity: HarmonyActivity) => {
    try {
      const isCurrentActivity = currentActivity?.id === activity.id;

      if (isCurrentActivity) {
        Logger.debug("Stopping activity", { activityId: activity.id });
        await stopActivity();
        showToast({
          style: Toast.Style.Success,
          title: "Activity stopped",
          message: activity.name,
        });
      } else {
        Logger.debug("Starting activity", { activityId: activity.id });
        await startActivity(activity.id);
        showToast({
          style: Toast.Style.Success,
          title: "Activity started",
          message: activity.name,
        });
      }

      // Refresh to update current activity
      await refresh();
    } catch (error) {
      Logger.error("Failed to handle activity:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Activity failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  if (error) {
    return <FeedbackState error={error} onRetry={refresh} title="Failed to load Harmony Hub" />;
  }

  useEffect(() => {
    Logger.debug("HarmonyCommand render", {
      view,
      deviceCount: filteredDevices.length,
      activityCount: filteredActivities.length,
      loadingStage: loadingState.stage,
    });
  }, [view, filteredDevices.length, filteredActivities.length, loadingState.stage]);

  // Show loading state
  if (loadingState.stage === HarmonyStage.DISCOVERING && hubs.length === 0) {
    return (
      <List isLoading={true}>
        <List.EmptyView
          key="loading"
          icon={Icon.CircleProgress}
          title="Discovering Harmony Hubs..."
          description={loadingState.message}
        />
      </List>
    );
  }

  // Show hub selection
  if (view === "hubs") {
    return (
      <List
        searchBarPlaceholder="Search hubs..."
        onSearchTextChange={setSearchText}
        isLoading={loadingState.stage === HarmonyStage.DISCOVERING}
      >
        <List.Section key="hub-selection" title="Available Hubs">
          {hubs.map((hub) => (
            <List.Item
              key={hub.ip}
              title={hub.name}
              subtitle={hub.ip}
              icon={Icon.Globe}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action title="Select Hub" onAction={() => handleHubSelect(hub)} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Clear Cache"
                      icon={Icon.Trash}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      onAction={clearCache}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={refresh}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      </List>
    );
  }

  // Show devices or activities based on view
  if (view === "devices") {
    return (
      <List
        searchBarPlaceholder="Search devices..."
        onSearchTextChange={setSearchText}
        searchBarAccessory={
          <List.Dropdown
            tooltip="Select View"
            value={view}
            onChange={(newView) => {
              setView(newView as "devices" | "activities" | "commands");
              setSelectedDevice(null); // Reset selected device when changing views
            }}
          >
            <List.Dropdown.Item key="devices" title="Devices" value="devices" />
            <List.Dropdown.Item key="activities" title="Activities" value="activities" />
            <List.Dropdown.Item key="commands" title="Commands" value="commands" />
          </List.Dropdown>
        }
      >
        {selectedDevice ? (
          // Show commands for selected device
          <List.Section key={selectedDevice.id} title={`${selectedDevice.name} Commands`}>
            {selectedDevice.commands
              .filter((command) => (searchText ? command.name.toLowerCase().includes(searchText.toLowerCase()) : true))
              .map((command) => {
                const itemKey = `${selectedDevice.id}-${command.id}`;
                return (
                  <List.Item
                    key={itemKey}
                    title={command.name}
                    icon={getCommandIcon(command.name)}
                    actions={
                      <ActionPanel>
                        <Action
                          title="Send Command"
                          onAction={() =>
                            handleCommand({
                              name: command.name,
                              deviceId: selectedDevice.id,
                              id: command.id,
                              group: command.group || "Default",
                            })
                          }
                        />
                        <Action
                          title="Back to Devices"
                          icon={Icon.ArrowLeft}
                          onAction={() => setSelectedDevice(null)}
                          shortcut={{ modifiers: ["cmd"], key: "[" }}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
          </List.Section>
        ) : (
          // Show list of devices
          <List.Section key="devices" title="Devices">
            {filteredDevices.map((device) => (
              <List.Item
                key={device.id}
                title={device.name}
                subtitle={`${device.commands.length} commands`}
                icon={Icon.Devices}
                actions={
                  <ActionPanel>
                    <Action title="View Commands" onAction={() => setSelectedDevice(device)} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        )}
      </List>
    );
  }

  if (view === "commands") {
    return (
      <List
        searchBarPlaceholder="Search commands..."
        onSearchTextChange={setSearchText}
        isLoading={[
          HarmonyStage.DISCOVERING,
          HarmonyStage.CONNECTING,
          HarmonyStage.LOADING_DEVICES,
          HarmonyStage.LOADING_ACTIVITIES,
          HarmonyStage.STARTING_ACTIVITY,
          HarmonyStage.STOPPING_ACTIVITY,
          HarmonyStage.EXECUTING_COMMAND,
          HarmonyStage.REFRESHING,
        ].includes(loadingState.stage)}
      >
        {devices.map((device) => {
          // Filter commands based on search text
          const filteredCommands = device.commands.filter((command) =>
            searchText
              ? command.name.toLowerCase().includes(searchText.toLowerCase()) ||
                device.name.toLowerCase().includes(searchText.toLowerCase())
              : true,
          );

          // Skip devices with no matching commands when searching
          if (searchText && filteredCommands.length === 0) {
            return null;
          }

          return (
            <List.Section key={device.id} title={device.name}>
              {filteredCommands.map((command) => (
                <List.Item
                  key={`${device.id}-${command.id}`}
                  title={command.name}
                  icon={Icon.Terminal}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Execute Command"
                        onAction={() =>
                          handleCommand({
                            name: command.name,
                            deviceId: device.id,
                            id: command.id,
                            group: command.group || "Default",
                          })
                        }
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          );
        })}
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Search activities..." onSearchTextChange={setSearchText}>
      <List.Section key="activities" title="Activities">
        {filteredActivities.map((activity) => (
          <List.Item
            key={activity.id}
            title={activity.name}
            icon={currentActivity?.id === activity.id ? Icon.CheckCircle : Icon.Circle}
            actions={
              <ActionPanel>
                <Action
                  title={currentActivity?.id === activity.id ? "Stop Activity" : "Start Activity"}
                  onAction={() => handleActivity(activity)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
