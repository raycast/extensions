import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  Color,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { getClashApi } from "./utils/clash-api";
import { ClashMode, MODE_ICONS, MODE_NAMES } from "./utils/types";

interface ModeItem {
  mode: ClashMode;
  name: string;
  icon: string;
  description: string;
  isCurrent: boolean;
}

export default function SwitchMode() {
  const [modes, setModes] = useState<ModeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMode, setCurrentMode] = useState<ClashMode | null>(null);

  const clashApi = getClashApi();

  // Mode descriptions
  const modeDescriptions: Record<ClashMode, string> = {
    rule: "Automatically select proxy or direct connection based on rules",
    global: "All traffic goes through proxy server",
    direct: "All traffic connects directly without proxy",
  };

  // Load current mode
  const loadCurrentMode = useCallback(async () => {
    try {
      const mode = await clashApi.getCurrentMode();
      setCurrentMode(mode);

      // Update mode list
      const allModes: ClashMode[] = ["rule", "global", "direct"];
      const modeItems: ModeItem[] = allModes.map((m) => ({
        mode: m,
        name: MODE_NAMES[m],
        icon: MODE_ICONS[m],
        description: modeDescriptions[m],
        isCurrent: m === mode,
      }));

      setModes(modeItems);
    } catch (error) {
      console.error("Failed to load current mode:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Load failed",
        message:
          error instanceof Error
            ? error.message
            : "Unable to get current proxy mode",
      });
    } finally {
      setIsLoading(false);
    }
  }, [clashApi, modeDescriptions]);

  // Switch mode
  const switchMode = async (targetMode: ClashMode) => {
    if (targetMode === currentMode) {
      showToast({
        style: Toast.Style.Success,
        title: "Already in this mode",
        message: `Current mode: ${MODE_NAMES[targetMode]}`,
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Switching mode...",
      message: `Switching to ${MODE_NAMES[targetMode]}`,
    });

    try {
      await clashApi.switchMode(targetMode);

      toast.style = Toast.Style.Success;
      toast.title = "Switch successful";
      toast.message = `Switched to ${MODE_NAMES[targetMode]}`;

      // Reload current mode
      await loadCurrentMode();
    } catch (error) {
      console.error("Failed to switch mode:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Switch failed";
      toast.message =
        error instanceof Error ? error.message : "Failed to switch proxy mode";
    }
  };

  // Check health status
  const checkHealth = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Checking connection status...",
    });

    try {
      const health = await clashApi.healthCheck();

      if (health.isHealthy) {
        toast.style = Toast.Style.Success;
        toast.title = "Connection normal";
        toast.message = `Version: ${health.version}, Mode: ${MODE_NAMES[health.mode ?? currentMode ?? "rule"]}`;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Connection error";
        toast.message = health.error || "Unable to connect to Clash API";
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Check failed";
      toast.message =
        error instanceof Error ? error.message : "Health check failed";
    }
  };

  useEffect(() => {
    loadCurrentMode();
  }, [loadCurrentMode]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search proxy modes...">
      <List.Section title="Proxy Modes">
        {modes.map((mode) => (
          <List.Item
            key={mode.mode}
            title={mode.name}
            subtitle={mode.description}
            icon={{
              source: mode.isCurrent ? Icon.CheckCircle : Icon.Circle,
              tintColor: mode.isCurrent ? Color.Green : Color.SecondaryText,
            }}
            accessories={[
              {
                text: mode.icon,
              },
              ...(mode.isCurrent
                ? [{ text: "Current Mode", icon: Icon.Checkmark }]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={`Switch to ${mode.name}`}
                  icon={Icon.Switch}
                  onAction={() => switchMode(mode.mode)}
                />

                <ActionPanel.Section title="Other Actions">
                  <Action
                    title="Refresh Status"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={loadCurrentMode}
                  />
                  <Action
                    title="Check Connection"
                    icon={Icon.Heartbeat}
                    shortcut={{ modifiers: ["cmd"], key: "h" }}
                    onAction={checkHealth}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {currentMode && (
        <List.Section title="Current Status">
          <List.Item
            title={`Current Mode: ${MODE_NAMES[currentMode]}`}
            subtitle={modeDescriptions[currentMode]}
            icon={{
              source: Icon.Info,
              tintColor: Color.Blue,
            }}
            accessories={[
              {
                text: MODE_ICONS[currentMode],
              },
            ]}
          />
        </List.Section>
      )}
    </List>
  );
}
