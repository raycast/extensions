import { Action, ActionPanel, Icon, LaunchType, List, Toast, launchCommand, showToast } from "@raycast/api";
import { useState } from "react";
import { restartApp } from "./app-utils";
import { AppConfig } from "./storage";

interface AppPickerProps {
  configs: AppConfig[];
}

export function AppPicker({ configs }: AppPickerProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  async function handleRestart(config: AppConfig) {
    try {
      setIsLoading(true);
      await showToast({ style: Toast.Style.Animated, title: `Restarting ${config.name}` });
      await restartApp(config.bundleId, config.delay);
      await showToast({ style: Toast.Style.Success, title: `Restarted ${config.name}` });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to restart app",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search apps to restart...">
      {configs.map((config) => (
        <List.Item
          key={config.id}
          title={config.name}
          subtitle={`Delay: ${config.delay}ms`}
          accessories={[{ text: config.bundleId }]}
          actions={
            <ActionPanel>
              <Action title="Restart App" icon={Icon.ArrowClockwise} onAction={() => handleRestart(config)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export async function runAppPicker() {
  // Since we can't directly render React components from a non-React context,
  // we'll store the configs in a way the view command can retrieve them and then launch that command
  // In a real implementation, you'd likely use shared storage to handle this
  await launchCommand({ name: "manage-configs-view", type: LaunchType.UserInitiated });
}
