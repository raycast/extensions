import { ActionPanel, Action, Alert, List, Icon, showToast, Toast, Color, open, confirmAlert } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import {
  getDetailedAudioDevices,
  getRunningAudioApps,
  getAppStatus,
  resetControlAppVolumeSettings,
  AudioDevice,
  AudioApp,
  AppStatus,
} from "./utils/audio";
import { AppVolumeControl } from "./components/AppVolumeControl";
import { clearAllAppPreferredDevices } from "./utils/preferences";

export default function Command() {
  const [runningApps, setRunningApps] = useState<AudioApp[]>([]);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [appStatuses, setAppStatuses] = useState<Record<string, AppStatus>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadAudioInfo = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const [audioDevices, apps] = await Promise.all([getDetailedAudioDevices(), getRunningAudioApps()]);

      setDevices(audioDevices);
      setRunningApps(apps);

      // Fetch statuses asynchronously
      const statuses: Record<string, AppStatus> = {};

      const results = await Promise.allSettled(
        apps.map(async (app) => {
          const status = await getAppStatus(app.name);
          return { bundleId: app.bundleId, status };
        }),
      );

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          statuses[result.value.bundleId] = result.value.status;
        }
      });

      setAppStatuses(statuses);
    } catch {
      console.error("Failed to load audio info");
      if (!silent) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load audio information",
        });
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAudioInfo();
    const interval = setInterval(() => loadAudioInfo(true), 2000);
    return () => clearInterval(interval);
  }, [loadAudioInfo]);

  const handleVolumeUpdate = (bundleId: string, volume: number) => {
    setAppStatuses((prev) => ({
      ...prev,
      [bundleId]: { ...prev[bundleId], volume },
    }));
  };

  const handleResetAllSettings = async () => {
    const confirmed = await confirmAlert({
      title: "Reset All Control App Volume Settings?",
      message: "This removes all per-app routes and per-app volume settings created from this command.",
      primaryAction: {
        title: "Reset Settings",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    setIsLoading(true);
    try {
      const [audioSettingsReset] = await Promise.all([resetControlAppVolumeSettings(), clearAllAppPreferredDevices()]);
      if (!audioSettingsReset) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Reset failed",
          message: "Could not reset FineTune settings",
        });
        return;
      }

      setAppStatuses({});
      await loadAudioInfo(true);
      await showToast({
        style: Toast.Style.Success,
        title: "Settings reset",
        message: "All Control App Volume settings were cleared",
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Reset failed",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search running apps...">
      <List.Section title="Running Audio Apps">
        {runningApps.map((app) => {
          const status = appStatuses[app.bundleId];

          // Filter out Safari if no media found (explicit user request),
          // but keep other apps (like Chrome) visible as they might play in background tabs.
          if (app.name === "Safari" && status?.state === "stopped") {
            return null;
          }

          const accessories: List.Item.Accessory[] = [];

          if (status) {
            if (status.state === "playing") {
              accessories.push({ tag: { value: "Playing", color: Color.Green } });
            } else if (status.state === "paused") {
              accessories.push({ tag: { value: "Paused", color: Color.Yellow } });
            }
            // If stopped/unknown (e.g. background tab), we simply show no status tag, just volume.

            if (status.volume !== null) {
              accessories.push({ tag: { value: `${status.volume}%`, color: Color.Blue } });
            }
          }

          return (
            <List.Item
              key={app.bundleId}
              icon={{ fileIcon: app.path }}
              title={app.name}
              subtitle="Control App Volume"
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Control App Audio"
                    icon={Icon.LevelMeter}
                    target={
                      <AppVolumeControl
                        app={app}
                        devices={devices}
                        onVolumeChange={(vol) => handleVolumeUpdate(app.bundleId, vol)}
                      />
                    }
                  />
                  <Action title="Bring to Front" icon={Icon.Window} onAction={() => open(app.path)} />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={loadAudioInfo}
                  />
                  <Action
                    title="Reset All Control App Volume Settings"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "k" }}
                    onAction={handleResetAllSettings}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {runningApps.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Music}
          title="No Audio Apps Running"
          description="Open Music, Spotify, or a browser playing media"
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadAudioInfo} />
              <Action
                title="Reset All Control App Volume Settings"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "k" }}
                onAction={handleResetAllSettings}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
