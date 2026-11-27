import { Action, ActionPanel, Color, Grid, Icon, showToast, Toast, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useCallback, useRef, useState } from "react";
import { launchOnDevice } from "./lib/actions";
import { createClient } from "./lib/preferences";
import { describeRokuError } from "./lib/roku";
import type { RokuApp, RokuDevice } from "./lib/types";
import { ConnectionHelp } from "./components/ConnectionHelp";
import { cachedIcon, loadIcons } from "./lib/icons";
import { DeviceSetup } from "./components/DeviceSetup";
import { useDevices } from "./components/useDevices";

export default function LaunchAppCommand() {
  const saved = useDevices();
  if (!saved.device) return <DeviceSetup {...saved} />;
  return (
    <AppsForDevice
      key={saved.device.id}
      device={saved.device}
      devices={saved.devices}
      selectedId={saved.selectedId}
      choose={saved.choose}
    />
  );
}

export function AppsForDevice({
  device,
  devices,
  selectedId,
  choose,
  navigationTitle,
}: {
  device: RokuDevice;
  devices?: RokuDevice[];
  selectedId?: string;
  choose?: (id: string) => Promise<void>;
  /** Only set when pushed; the command root keeps Raycast's title. */
  navigationTitle?: string;
}) {
  // A launch's confirmed app replaces the loaded one until the next refresh.
  const [launchedApp, setLaunchedApp] = useState<RokuApp>();
  const busy = useRef(false);

  const {
    data,
    isLoading: appsLoading,
    error: loadError,
    revalidate,
  } = usePromise(
    async (id: string, host: string) => {
      const client = createClient({ ...device, id, host });
      const [info, installed, active] = await Promise.allSettled([
        client.getDeviceInfo(),
        client.getApps(),
        client.getActiveApp(),
      ]);
      if (info.status === "fulfilled" && info.value.id !== id) {
        throw new Error(
          "This address now belongs to a different Roku. Discover TVs again in Manage TVs before controlling it.",
        );
      }
      if (installed.status === "rejected") throw installed.reason;
      if (info.status === "rejected") throw info.reason;
      return {
        apps: installed.value,
        activeApp: active.status === "fulfilled" ? active.value : undefined,
      };
    },
    // Keyed on id and host so a re-discovered address reloads the list.
    [device.id, device.host],
    { onError: () => undefined },
  );
  const apps: RokuApp[] = data?.apps ?? [];
  const activeApp = launchedApp ?? data?.activeApp;
  const error = loadError ? describeRokuError(loadError) : undefined;
  const isLoading = appsLoading;

  // Icons: show cached files immediately, then download the rest in the background.
  const appIds = apps.map((app) => app.id);
  const { data: loadedIcons } = usePromise((ids: string[]) => loadIcons(device, ids), [appIds], {
    execute: appIds.length > 0,
    onError: () => undefined,
  });
  const icons: Record<string, string> = loadedIcons ?? {};
  if (!loadedIcons) {
    for (const id of appIds) {
      const path = cachedIcon(device, id);
      if (path) icons[id] = path;
    }
  }

  const reload = useCallback(async () => {
    setLaunchedApp(undefined);
    await revalidate();
  }, [revalidate]);

  async function launch(app: RokuApp) {
    if (busy.current) return;
    busy.current = true;
    const isInput = app.id.startsWith("tvinput.");
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: isInput ? "Switching input…" : `Opening ${app.name}…`,
      message: device.name,
    });
    try {
      const result = await launchOnDevice(device, app.id, { name: app.name });
      if (result.activeApp) setLaunchedApp(result.activeApp);
      toast.style = Toast.Style.Success;
      toast.title = result.confirmed
        ? isInput
          ? `Switched to ${app.name}`
          : `Opened ${app.name}`
        : "Launch command sent";
      toast.message = `${device.name}: ${result.message}`;
    } catch (cause) {
      toast.style = Toast.Style.Failure;
      toast.title = isInput ? "Couldn't switch input" : "Couldn't launch app";
      toast.message = describeRokuError(cause);
    } finally {
      busy.current = false;
    }
  }

  const streamingApps = apps.filter((app) => !app.id.startsWith("tvinput."));
  const inputs = apps.filter((app) => app.id.startsWith("tvinput."));
  function item(app: RokuApp) {
    const input = app.id.startsWith("tvinput.");
    const active = activeApp?.id === app.id;
    return (
      <Grid.Item
        key={app.id}
        title={app.name}
        subtitle={active ? "● On now" : undefined}
        keywords={[app.id]}
        content={
          icons[app.id]
            ? { source: icons[app.id] }
            : {
                value: { source: input ? Icon.Plug : Icon.AppWindow, tintColor: Color.SecondaryText },
                tooltip: app.name,
              }
        }
        actions={
          <ActionPanel>
            <Action
              title={input ? "Switch to This Input" : "Open App on TV"}
              icon={input ? Icon.Plug : Icon.Play}
              onAction={() => launch(app)}
            />
            <Action.CopyToClipboard title="Copy App ID" content={app.id} />
            <Action
              title="Refresh App List"
              icon={Icon.ArrowClockwise}
              onAction={reload}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            />
            <Action.Push title="Connection Help" icon={Icon.Info} target={<ConnectionHelp device={device} />} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Grid
      columns={6}
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Zero}
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Search apps and TV inputs…"
      searchBarAccessory={
        devices && choose ? (
          <Grid.Dropdown tooltip="Choose a Roku TV" value={selectedId ?? ""} onChange={(id) => void choose(id)}>
            {devices.map((tv) => (
              <Grid.Dropdown.Item key={tv.id} value={tv.id} title={tv.name} />
            ))}
          </Grid.Dropdown>
        ) : undefined
      }
    >
      {error ? (
        <Grid.EmptyView
          icon={Icon.Warning}
          title="Couldn't load apps"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={reload} />
              <Action.Push
                title="View Connection Help"
                icon={Icon.Info}
                target={<ConnectionHelp device={device} message={error} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        <Grid.EmptyView
          icon={Icon.AppWindowGrid3x3}
          title={isLoading ? "Loading apps…" : "No apps were returned"}
          description={isLoading ? device.name : "Refresh the list or check the TV's connection."}
          actions={
            <ActionPanel>
              <Action title="Refresh App List" icon={Icon.ArrowClockwise} onAction={reload} />
            </ActionPanel>
          }
        />
      )}
      {!error && streamingApps.length ? (
        <Grid.Section title="Apps" subtitle={activeApp ? `On now: ${activeApp.name}` : device.name}>
          {streamingApps.map(item)}
        </Grid.Section>
      ) : null}
      {!error && inputs.length ? <Grid.Section title="TV Inputs">{inputs.map(item)}</Grid.Section> : null}
    </Grid>
  );
}
