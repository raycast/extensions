import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { formatErrorMessage } from "./lib/errors";
import { getMihomoConfig, setProxyMode } from "./lib/mihomo";
import { Mode } from "./lib/types";

const MODE_ITEMS: { mode: Mode; title: string; subtitle: string }[] = [
  { mode: "rule", title: "Rule", subtitle: "Follow routing rules from the active profile" },
  { mode: "global", title: "Global", subtitle: "Force all traffic through the selected proxy" },
  { mode: "direct", title: "Direct", subtitle: "Bypass proxy and connect directly" },
];

export default function ProxyModeCommand() {
  const [currentMode, setCurrentMode] = useState<Mode | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const loadMode = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(undefined);

    try {
      const config = await getMihomoConfig();
      setCurrentMode(config.mode);
    } catch (error) {
      setErrorMessage(formatErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMode();
  }, [loadMode]);

  const switchMode = useCallback(
    async (mode: Mode) => {
      await showToast({ style: Toast.Style.Animated, title: `Switching to ${mode} mode...` });

      try {
        await setProxyMode(mode);
        await loadMode();
        await showToast({ style: Toast.Style.Success, title: `Proxy mode switched to ${mode}` });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Failed to switch to ${mode}`,
          message: formatErrorMessage(error),
        });
      }
    },
    [loadMode],
  );

  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        icon={Icon.Globe}
        title="No Proxy Modes Available"
        description="Refresh after Clash Verge starts, or clear the search filter to see all proxy modes."
      />

      {MODE_ITEMS.map((item) => (
        <List.Item
          key={item.mode}
          icon={currentMode === item.mode ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
          title={item.title}
          subtitle={item.subtitle}
          accessories={currentMode === item.mode ? [{ text: "Current" }] : []}
          actions={
            <ActionPanel>
              <Action title={`Set ${item.title} Mode`} onAction={() => void switchMode(item.mode)} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void loadMode()} />
            </ActionPanel>
          }
        />
      ))}

      {errorMessage && (
        <List.Item
          icon={Icon.ExclamationMark}
          title="Mode Load Failed"
          subtitle={errorMessage}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void loadMode()} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
