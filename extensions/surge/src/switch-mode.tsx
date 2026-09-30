import { ActionPanel, Icon, List, getPreferenceValues, showHUD, showToast, Color, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import api from "./api.js";
import { OutBoundMode } from "./types.js";

const OUTBOUND_MODES = {
  direct: {
    title: "Direct Outbound",
    subtitle: "Connect directly without proxy",
    raycastIcon: Icon.ArrowRight,
    icon: "🔄",
  },
  proxy: {
    title: "Global Proxy",
    subtitle: "Route all traffic through proxy",
    raycastIcon: Icon.Globe,
    icon: "🌐",
  },
  rule: {
    title: "Rule-Based Proxy",
    subtitle: "Use rules to determine routing",
    raycastIcon: Icon.List,
    icon: "📋",
  },
};

export default function Command() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const xKey = preferences["x-key"];
  const port = preferences.port;

  const [currentMode, setCurrentMode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCurrentMode() {
      try {
        const response = await api(xKey, port).getOutboundMode();
        setCurrentMode(response.data.mode);
      } catch (error) {
        console.error("🚀 ~ switch-mode.tsx:40 ~ fetchCurrentMode ~ error:", error);
        await showToast(Toast.Style.Failure, "Failed to fetch current mode", "Please check your X-Key and port");
      } finally {
        setIsLoading(false);
      }
    }

    fetchCurrentMode();
  }, []);

  async function switchMode(mode: OutBoundMode) {
    try {
      await api(xKey, port).changeOutboundMode(mode);
      const modeInfo = OUTBOUND_MODES[mode as keyof typeof OUTBOUND_MODES];
      await showHUD(`${modeInfo.icon} ${modeInfo.title}`);
    } catch (error) {
      console.error("🚀 ~ switch-mode.tsx:56 ~ switchMode ~ error:", error);
      await showToast(
        Toast.Style.Failure,
        "Failed to switch mode",
        "Please check your X-Key, port and function availability",
      );
    }
  }

  return (
    <List isLoading={isLoading}>
      {Object.entries(OUTBOUND_MODES).map(([key, modeInfo]) => (
        <List.Item
          key={key}
          icon={{
            source: modeInfo.raycastIcon,
            tintColor: currentMode === key ? Color.Green : Color.SecondaryText,
          }}
          title={modeInfo.title}
          subtitle={modeInfo.subtitle}
          accessoryIcon={currentMode === key ? Icon.Checkmark : undefined}
          actions={
            <ActionPanel>
              <ActionPanel.Item
                title={`Switch to ${modeInfo.title}`}
                onAction={() => switchMode(key as OutBoundMode)}
                icon={modeInfo.raycastIcon}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
