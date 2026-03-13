import { ActionPanel, Action, Alert, List, Icon, showToast, Toast, Color, open, confirmAlert } from "@raycast/api";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  getDetailedAudioDevices,
  getRunningAudioApps,
  getAppStatus,
  getOutputDeviceIconSourceFromName,
  getAppOutputDevices,
  resetControlAppVolumeSettings,
  AudioDevice,
  AudioApp,
  AppStatus,
} from "./utils/audio";
import { AppVolumeControl } from "./components/AppVolumeControl";
import { clearAllAppPreferredDevices } from "./utils/preferences";

const APP_STATUS_TIMEOUT_MS = 1200;
const APP_STATUS_ACTIVE_REFRESH_MS = 2500;
const APP_STATUS_IDLE_REFRESH_MS = 9000;
const APP_ROUTES_REFRESH_MS = 30000;
const BACKGROUND_REFRESH_MS = 3000;

function getAppsSignature(apps: AudioApp[]): string {
  return apps
    .map((app) => app.bundleId)
    .sort((a, b) => a.localeCompare(b))
    .join("|");
}

export default function Command() {
  const [runningApps, setRunningApps] = useState<AudioApp[]>([]);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [appStatuses, setAppStatuses] = useState<Record<string, AppStatus>>({});
  const [appRoutes, setAppRoutes] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const devicesRef = useRef<AudioDevice[]>([]);
  const appStatusesRef = useRef<Record<string, AppStatus>>({});
  const appRoutesRef = useRef<Record<string, string | null>>({});
  const statusFetchedAtRef = useRef<Record<string, number>>({});
  const routesFetchedAtRef = useRef(0);
  const routesAppsSignatureRef = useRef("");
  const refreshInProgressRef = useRef(false);
  const statusRefreshInProgressRef = useRef(false);
  const routeRefreshInProgressRef = useRef(false);

  const refreshAppStatuses = useCallback(async (apps: AudioApp[]) => {
    if (statusRefreshInProgressRef.current) return;
    statusRefreshInProgressRef.current = true;

    try {
      const activeBundleIds = new Set(apps.map((app) => app.bundleId));
      const now = Date.now();
      const appsToRefreshStatuses = apps.filter((app) => {
        const previousStatus = appStatusesRef.current[app.bundleId];
        if (!previousStatus) return true;

        const lastFetchedAt = statusFetchedAtRef.current[app.bundleId] ?? 0;
        const minRefreshMs = app.activeOutputDetected ? APP_STATUS_ACTIVE_REFRESH_MS : APP_STATUS_IDLE_REFRESH_MS;
        return now - lastFetchedAt >= minRefreshMs;
      });

      if (appsToRefreshStatuses.length === 0) {
        return;
      }

      await Promise.allSettled(
        appsToRefreshStatuses.map(async (app) => {
          statusFetchedAtRef.current[app.bundleId] = Date.now();
          const incoming = await Promise.race<AppStatus>([
            getAppStatus(app.name, app.bundleId),
            new Promise<AppStatus>((resolve) => {
              setTimeout(() => resolve({ volume: null, state: "unknown" }), APP_STATUS_TIMEOUT_MS);
            }),
          ]);
          setAppStatuses((prev) => {
            const next: Record<string, AppStatus> = {};

            for (const [bundleId, status] of Object.entries(prev)) {
              if (activeBundleIds.has(bundleId)) {
                next[bundleId] = status;
              }
            }

            next[app.bundleId] = {
              volume: incoming.volume !== null ? incoming.volume : null,
              state: incoming.state,
            };

            appStatusesRef.current = next;
            return next;
          });
        }),
      );
    } finally {
      statusRefreshInProgressRef.current = false;
    }
  }, []);

  const refreshAppRoutes = useCallback(async (apps: AudioApp[], force = false) => {
    const appsSignature = getAppsSignature(apps);
    const now = Date.now();
    const shouldRefreshRoutes =
      force ||
      routesAppsSignatureRef.current !== appsSignature ||
      now - routesFetchedAtRef.current >= APP_ROUTES_REFRESH_MS;

    if (!shouldRefreshRoutes) {
      setAppRoutes((prev) => {
        const next: Record<string, string | null> = {};
        for (const app of apps) {
          if (prev[app.bundleId] !== undefined) {
            next[app.bundleId] = prev[app.bundleId];
            continue;
          }

          if (appRoutesRef.current[app.bundleId] !== undefined) {
            next[app.bundleId] = appRoutesRef.current[app.bundleId];
          }
        }

        appRoutesRef.current = next;
        return next;
      });
      return;
    }

    if (routeRefreshInProgressRef.current) return;
    routeRefreshInProgressRef.current = true;

    try {
      const nextRoutes = await getAppOutputDevices(apps.map((app) => app.bundleId));
      routesFetchedAtRef.current = Date.now();
      routesAppsSignatureRef.current = appsSignature;
      appRoutesRef.current = nextRoutes;
      setAppRoutes(nextRoutes);
    } finally {
      routeRefreshInProgressRef.current = false;
    }
  }, []);

  const loadAudioInfo = useCallback(
    async (silent = false) => {
      if (refreshInProgressRef.current) return;
      refreshInProgressRef.current = true;

      let loadingSettled = false;

      try {
        if (!silent) setIsLoading(true);
        const shouldLoadDevices = !silent || devicesRef.current.length === 0;
        const appsPromise = getRunningAudioApps();
        const devicesPromise = shouldLoadDevices ? getDetailedAudioDevices() : Promise.resolve(devicesRef.current);
        const apps = await appsPromise;
        setRunningApps(apps);

        if (!silent) {
          setIsLoading(false);
          loadingSettled = true;
        }

        void refreshAppStatuses(apps);
        void refreshAppRoutes(apps, !silent);

        if (shouldLoadDevices) {
          const audioDevices = await devicesPromise;
          devicesRef.current = audioDevices;
          setDevices(audioDevices);
        }
      } catch {
        console.error("Failed to load audio info");
        if (!silent) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to load audio information",
          });
        }
      } finally {
        if (!silent && !loadingSettled) setIsLoading(false);
        refreshInProgressRef.current = false;
      }
    },
    [refreshAppRoutes, refreshAppStatuses],
  );

  useEffect(() => {
    void loadAudioInfo();
    const interval = setInterval(() => void loadAudioInfo(true), BACKGROUND_REFRESH_MS);
    return () => clearInterval(interval);
  }, [loadAudioInfo]);

  const handleVolumeUpdate = (bundleId: string, volume: number) => {
    setAppStatuses((prev) => {
      const next = {
        ...prev,
        [bundleId]: { ...prev[bundleId], volume },
      };
      appStatusesRef.current = next;
      return next;
    });
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
      appStatusesRef.current = {};
      statusFetchedAtRef.current = {};
      setAppRoutes({});
      appRoutesRef.current = {};
      routesFetchedAtRef.current = 0;
      routesAppsSignatureRef.current = "";
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

  const getVolumeIcon = (volume: number): Icon => {
    if (volume <= 0) return Icon.SpeakerOff;
    if (volume <= 35) return Icon.SpeakerLow;
    if (volume <= 85) return Icon.SpeakerOn;
    return Icon.SpeakerHigh;
  };

  const systemOutputDevice = devices.find((device) => device.isDefault);
  const systemOutputUid = systemOutputDevice?.uid;
  const systemOutputName = systemOutputDevice?.name || "System Output";
  const visibleApps = runningApps.filter((app) => {
    const appName = app.name.toLowerCase();
    if (appName.includes("safari graphics and media")) {
      return false;
    }

    const status = appStatuses[app.bundleId];
    const isPlaying = status?.state === "playing";
    const isPaused = status?.state === "paused" || status?.state === "stopped";
    const isActiveOutput = app.activeOutputDetected === true;
    return isPlaying || isPaused || isActiveOutput;
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search running apps...">
      <List.Section title="Running Audio Apps">
        {visibleApps.map((app) => {
          const status = appStatuses[app.bundleId];
          const isPlaying = status?.state === "playing";
          const isPaused = status?.state === "paused" || status?.state === "stopped";
          const isActiveOutput = app.activeOutputDetected === true;
          const routedDeviceUid = appRoutes[app.bundleId];
          const routedDevice = routedDeviceUid ? devices.find((device) => device.uid === routedDeviceUid) : undefined;
          const isRouted = Boolean(routedDeviceUid && routedDeviceUid !== systemOutputUid);
          const routedDeviceName = routedDevice?.name ?? null;
          const outputDeviceName = isRouted ? routedDeviceName || routedDeviceUid || "Routed Output" : systemOutputName;
          const outputIconSource = isRouted
            ? getOutputDeviceIconSourceFromName(routedDeviceName || routedDeviceUid)
            : getOutputDeviceIconSourceFromName(systemOutputName);
          const displayVolume = status?.volume ?? 100;

          const accessories: List.Item.Accessory[] = [];

          if (status) {
            if (isPlaying) {
              accessories.push({ tag: { value: "Playing", color: Color.Green } });
            } else if (isPaused) {
              accessories.push({ tag: { value: "Paused", color: Color.Yellow } });
            } else if (isActiveOutput) {
              accessories.push({ tag: { value: "Active", color: Color.Green } });
            }

            accessories.push({
              icon: { source: getVolumeIcon(displayVolume), tintColor: Color.PrimaryText },
              tooltip: `Volume ${displayVolume}%`,
            });
            accessories.push({
              tag: { value: `${displayVolume}%`, color: Color.PrimaryText },
            });
          } else if (isActiveOutput) {
            accessories.push({ tag: { value: "Active", color: Color.Green } });
            accessories.push({
              icon: { source: getVolumeIcon(displayVolume), tintColor: Color.PrimaryText },
              tooltip: `Volume ${displayVolume}%`,
            });
            accessories.push({
              tag: { value: `${displayVolume}%`, color: Color.PrimaryText },
            });
          } else {
            accessories.push({
              icon: { source: getVolumeIcon(displayVolume), tintColor: Color.PrimaryText },
              tooltip: `Volume ${displayVolume}%`,
            });
            accessories.push({
              tag: { value: `${displayVolume}%`, color: Color.PrimaryText },
            });
          }

          accessories.push({
            icon: { source: outputIconSource, tintColor: Color.PrimaryText },
            tooltip: isRouted ? "Routed Output Device" : "System Output Device",
          });
          accessories.push({ tag: { value: outputDeviceName, color: Color.PrimaryText } });

          if (isRouted) {
            accessories.push({
              icon: { source: Icon.ArrowRightCircle, tintColor: Color.PrimaryText },
              tooltip: "Routed",
            });
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
                        initialStatus={status}
                        initialRoutedDeviceUid={routedDeviceUid}
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

      {visibleApps.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Music}
          title="No Active Audio Apps"
          description="Start media playback to see apps here"
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
