import { useState, useEffect, useCallback } from "react";
import {
  List,
  Icon,
  Color,
  Action,
  ActionPanel,
  showToast,
  Toast,
} from "@raycast/api";
import { getConfigs, patchConfigs, ClashConfig } from "./utils/api";

// --- Mode definitions ---

interface ModeInfo {
  name: string;
  value: "rule" | "global" | "direct";
  icon: Icon;
  description: string;
  color: Color;
}

const MODES: ModeInfo[] = [
  {
    name: "Rule Mode",
    value: "rule",
    icon: Icon.Filter,
    description: "Route traffic based on rules (recommended)",
    color: Color.Blue,
  },
  {
    name: "Global Mode",
    value: "global",
    icon: Icon.Globe,
    description: "Route all traffic through the proxy",
    color: Color.Orange,
  },
  {
    name: "Direct Mode",
    value: "direct",
    icon: Icon.Link,
    description: "Connect directly without proxy",
    color: Color.Green,
  },
];

// --- Main Command ---

export default function SwitchMode() {
  const [config, setConfig] = useState<ClashConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getConfigs();
      setConfig(data);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch configuration",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSwitchMode = async (mode: ModeInfo) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Switching to ${mode.name}...`,
      });
      await patchConfigs({ mode: mode.value });
      await fetchConfig();
      showToast({
        style: Toast.Style.Success,
        title: `Switched to ${mode.name}`,
        message: mode.description,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to switch mode",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const currentMode = config?.mode || "rule";

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select proxy mode...">
      <List.Section title="Proxy Mode" subtitle={`Current: ${currentMode}`}>
        {MODES.map((mode) => {
          const isActive = mode.value === currentMode;
          return (
            <List.Item
              key={mode.value}
              title={mode.name}
              subtitle={mode.description}
              icon={{
                source: isActive ? Icon.CheckCircle : mode.icon,
                tintColor: isActive ? Color.Green : mode.color,
              }}
              accessories={
                isActive
                  ? [{ tag: { value: "Active", color: Color.Green } }]
                  : []
              }
              actions={
                <ActionPanel>
                  <Action
                    title={
                      isActive ? "Already Active" : `Switch to ${mode.name}`
                    }
                    icon={isActive ? Icon.CheckCircle : Icon.ArrowRight}
                    onAction={() => {
                      if (!isActive) handleSwitchMode(mode);
                    }}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={fetchConfig}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {config && (
        <List.Section title="Current Config">
          <List.Item
            title="Mixed Port"
            subtitle={String(config["mixed-port"] || "N/A")}
            icon={Icon.Network}
          />
          <List.Item
            title="Allow LAN"
            subtitle={config["allow-lan"] ? "Enabled" : "Disabled"}
            icon={config["allow-lan"] ? Icon.Check : Icon.Multiply}
          />
          <List.Item
            title="Log Level"
            subtitle={config["log-level"] || "info"}
            icon={Icon.List}
          />
        </List.Section>
      )}
    </List>
  );
}
