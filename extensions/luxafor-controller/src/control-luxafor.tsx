import React, { useState, useEffect } from "react";
import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  getPreferenceValues,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  openExtensionPreferences,
} from "@raycast/api";
import { LuxaforService, LuxaforColor } from "./luxafor-service";
import { luxaforState, DeviceStatus } from "./luxafor-state";
import { showFailureToast } from "@raycast/utils";

interface Preferences {
  userId: string;
  apiEndpoint: "com" | "co.uk";
  menubarMode: "simple" | "full";
  debugMode: boolean;
}

export default function ControlLuxafor() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastAction, setLastAction] = useState<string>("");
  const [currentStatus, setCurrentStatus] = useState<DeviceStatus>({
    isOnline: false,
    currentColor: "unknown",
    lastSeen: null,
    lastAction: "",
  });

  const preferences = getPreferenceValues<Preferences>();
  const luxaforService = new LuxaforService(preferences);

  // Helper function to get color tint for icons
  const getColorTint = (color: string): Color => {
    switch (color) {
      case "red":
        return Color.Red;
      case "green":
        return Color.Green;
      case "blue":
        return Color.Blue;
      case "yellow":
        return Color.Yellow;
      case "cyan":
        return Color.Blue;
      case "magenta":
        return Color.Purple;
      case "white":
        return Color.PrimaryText;
      case "off":
        return Color.SecondaryText;
      default:
        return Color.SecondaryText;
    }
  };

  // Subscribe to global state changes
  useEffect(() => {
    const unsubscribe = luxaforState.subscribe((status) => {
      setCurrentStatus(status);
      setLastAction(status.lastAction);
    });

    // Initialize with current state
    const initializeState = async () => {
      await luxaforState.waitForInitialization();
      const status = luxaforState.getStatus();
      setCurrentStatus(status);
      setLastAction(status.lastAction);
    };

    initializeState();

    return unsubscribe;
  }, []);

  const handleAction = async (action: () => Promise<{ success: boolean; error?: string }>, actionName: string) => {
    if (!preferences.userId) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please set your Luxafor User ID in preferences",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await action();
      if (result.success) {
        showToast({
          style: Toast.Style.Success,
          title: "Success",
          message: `${actionName} executed successfully`,
        });

        // Update local state with the action name
        setLastAction(actionName);

        // The service already updates the global state, so we just need to get the updated status
        const globalStatus = luxaforState.getStatus();
        setLastAction(globalStatus.lastAction);
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: result.error || "Unknown error occurred",
        });
      }
    } catch (error) {
      showFailureToast(error, { title: "Failed to execute action" });
    } finally {
      setIsLoading(false);
    }
  };

  const basicColors = [
    {
      name: "Red",
      color: "red" as LuxaforColor,
      icon: Icon.Circle,
      tintColor: Color.Red,
    },
    {
      name: "Green",
      color: "green" as LuxaforColor,
      icon: Icon.Circle,
      tintColor: Color.Green,
    },
    {
      name: "Blue",
      color: "blue" as LuxaforColor,
      icon: Icon.Circle,
      tintColor: Color.Blue,
    },
    {
      name: "Yellow",
      color: "yellow" as LuxaforColor,
      icon: Icon.Circle,
      tintColor: Color.Yellow,
    },
    {
      name: "Cyan",
      color: "cyan" as LuxaforColor,
      icon: Icon.Circle,
      tintColor: Color.Blue,
    },
    {
      name: "Magenta",
      color: "magenta" as LuxaforColor,
      icon: Icon.Circle,
      tintColor: Color.Purple,
    },
    {
      name: "White",
      color: "white" as LuxaforColor,
      icon: Icon.Circle,
      tintColor: Color.SecondaryText,
    },
  ];

  const testConnection = async () => {
    await confirmAlert({
      title: "Test Connection",
      message: "This will briefly turn your Luxafor device red to test the connection. Continue?",
      primaryAction: {
        title: "Test",
        style: Alert.ActionStyle.Default,
      },
    });

    await handleAction(() => luxaforService.testConnection(), "Connection Test");
  };

  const checkConnectionHealth = async () => {
    setIsLoading(true);
    try {
      const isOnline = await luxaforState.forceHealthCheck();
      if (isOnline) {
        showToast({
          style: Toast.Style.Success,
          title: "Success",
          message: "Device is online and webhook is live",
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Device is offline or webhook is not responding",
        });
      }
    } catch (error) {
      showFailureToast(error, { title: "Failed to check connection health" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <List isLoading={isLoading}>
      <List.Section title="Current Status" subtitle="Real-time device status">
        <List.Item
          title="Device Status"
          subtitle={`${currentStatus.currentColor.charAt(0).toUpperCase() + currentStatus.currentColor.slice(1)} • ${currentStatus.isOnline ? "Online" : "Offline"}`}
          icon={{
            source: Icon.Circle,
            tintColor: getColorTint(currentStatus.currentColor),
          }}
          accessories={[
            {
              icon: {
                source: currentStatus.isOnline ? Icon.Wifi : Icon.XmarkCircle,
                tintColor: currentStatus.isOnline ? Color.Green : Color.Red,
              },
              tooltip: currentStatus.isOnline ? "Device Online" : "Device Offline",
            },
            ...(currentStatus.lastSeen
              ? [
                  {
                    date: currentStatus.lastSeen,
                    tooltip: "Last Activity",
                  },
                ]
              : []),
          ]}
        />
      </List.Section>

      <List.Section title="Basic Controls" subtitle="Turn device on/off and choose from color palette">
        <List.Item
          title="Turn Off"
          subtitle="Turn all LEDs off"
          icon={{ source: Icon.Power, tintColor: Color.SecondaryText }}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Light Controls">
                <Action
                  title="Turn off"
                  icon={Icon.Power}
                  onAction={() => handleAction(() => luxaforService.turnOff(), "Turn Off")}
                />
              </ActionPanel.Section>

              <ActionPanel.Section title="Utilities">
                <Action
                  title="Test Connection"
                  icon={Icon.Wifi}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                  onAction={testConnection}
                />
                <Action
                  title="Check Connection Health"
                  icon={Icon.Heart}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                  onAction={checkConnectionHealth}
                />
                <Action
                  title="Open Extension Settings"
                  icon={Icon.Gear}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                  onAction={() => openExtensionPreferences()}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />

        {basicColors.map((colorItem) => (
          <List.Item
            key={colorItem.color}
            title={colorItem.name}
            subtitle={`Set ${colorItem.name.toLowerCase()} color`}
            icon={{ source: colorItem.icon, tintColor: colorItem.tintColor }}
            accessories={[
              {
                icon: { source: Icon.Circle, tintColor: colorItem.tintColor },
                tooltip: `Set ${colorItem.name}`,
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Light Controls">
                  <Action
                    title={`Set ${colorItem.name}`}
                    icon={colorItem.icon}
                    onAction={() =>
                      handleAction(() => luxaforService.setSolidColor(colorItem.color), `Set ${colorItem.name}`)
                    }
                  />
                  <Action
                    title={`Blink ${colorItem.name}`}
                    icon={Icon.LightBulb}
                    onAction={() =>
                      handleAction(() => luxaforService.blink(colorItem.color), `Blink ${colorItem.name}`)
                    }
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Utilities">
                  <Action
                    title="Test Connection"
                    icon={Icon.Wifi}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    onAction={testConnection}
                  />
                  <Action
                    title="Check Connection Health"
                    icon={Icon.Heart}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                    onAction={checkConnectionHealth}
                  />
                  <Action
                    title="Open Extension Settings"
                    icon={Icon.Gear}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                    onAction={() => openExtensionPreferences()}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Utilities" subtitle="Additional tools and settings">
        {lastAction && preferences.debugMode && (
          <List.Item
            title="Debug Information"
            subtitle={`Last action: ${lastAction} at ${currentStatus.lastSeen ? currentStatus.lastSeen.toLocaleString() : "unknown time"}`}
            icon={{ source: Icon.Bug, tintColor: Color.Orange }}
            accessories={[
              {
                icon: { source: Icon.Clock, tintColor: Color.Blue },
                tooltip: `Last action at ${currentStatus.lastSeen ? currentStatus.lastSeen.toLocaleString() : "unknown time"}`,
              },
              {
                icon: {
                  source: Icon.Circle,
                  tintColor: getColorTint(currentStatus.currentColor),
                },
                tooltip: `Current color: ${currentStatus.currentColor}`,
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Debug">
                  <Action
                    title="View Debug Details"
                    icon={Icon.Bug}
                    onAction={() => {
                      showToast({
                        style: Toast.Style.Success,
                        title: "Debug Info",
                        message: "Debug information available",
                      });
                      // Debug info available for development purposes
                    }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Utilities">
                  <Action
                    title="Test Connection"
                    icon={Icon.Wifi}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    onAction={testConnection}
                  />
                  <Action
                    title="Check Connection Health"
                    icon={Icon.Heart}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                    onAction={checkConnectionHealth}
                  />
                  <Action
                    title="Open Extension Settings"
                    icon={Icon.Gear}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                    onAction={() => openExtensionPreferences()}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      <List.Section title="Configuration" subtitle="Current settings">
        <List.Item
          title="Settings"
          subtitle={
            preferences.debugMode
              ? `User ID: ${preferences.userId ? preferences.userId.substring(0, 8) + "..." : "Not set"} • API: api.luxafor.${preferences.apiEndpoint}`
              : "Manage extension configuration"
          }
          icon={{ source: Icon.Gear, tintColor: Color.Blue }}
          accessories={
            preferences.debugMode
              ? [
                  {
                    icon: {
                      source: Icon.Person,
                      tintColor: preferences.userId ? Color.Green : Color.Red,
                    },
                    tooltip: preferences.userId ? "User ID Set" : "User ID Missing",
                  },
                  {
                    icon: { source: Icon.Globe, tintColor: Color.Blue },
                    tooltip: `API: api.luxafor.${preferences.apiEndpoint}`,
                  },
                ]
              : []
          }
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Configuration">
                <Action title="Open Extension Settings" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
              </ActionPanel.Section>

              <ActionPanel.Section title="Utilities">
                <Action
                  title="Test Connection"
                  icon={Icon.Wifi}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                  onAction={testConnection}
                />
                <Action
                  title="Check Connection Health"
                  icon={Icon.Heart}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                  onAction={checkConnectionHealth}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
