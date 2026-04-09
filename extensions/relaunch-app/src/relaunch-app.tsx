import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  Color,
  confirmAlert,
  Alert,
  closeMainWindow,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getRunningApps, restartApp, type RunningApp } from "./running-apps";

export default function Command() {
  const [apps, setApps] = useState<RunningApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    getRunningApps()
      .then(setApps)
      .catch((e) => setError(String(e)))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleRestart(app: RunningApp) {
    const confirmed = await confirmAlert({
      title: `Restart "${app.name}"?`,
      message:
        "The app will be force-killed and relaunched. Unsaved work will be lost.",
      primaryAction: {
        title: "Restart",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await handleRestartWithToast(app);
    }
  }

  async function handleRestartWithToast(app: RunningApp): Promise<void> {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Restarting ${app.name}…`,
    });

    try {
      await restartApp(app);

      toast.style = Toast.Style.Success;
      toast.title = `${app.name} restarted`;
      await closeMainWindow();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to restart ${app.name}`;
      toast.message = String(error);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search running apps…">
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Failed to load apps"
          description={error}
        />
      ) : (
        apps.map((app) => (
          <List.Item
            key={app.pid}
            icon={
              app.bundlePath
                ? { fileIcon: app.bundlePath }
                : { source: Icon.AppWindow, tintColor: Color.Blue }
            }
            title={app.name}
            subtitle={app.bundleId}
            accessories={[{ text: `PID ${app.pid}` }]}
            actions={
              <ActionPanel>
                <Action
                  title="Restart App"
                  icon={Icon.RotateClockwise}
                  onAction={() => handleRestart(app)}
                />
                <Action
                  title="Restart Without Confirmation"
                  icon={Icon.Bolt}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  onAction={() => handleRestartWithToast(app)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
