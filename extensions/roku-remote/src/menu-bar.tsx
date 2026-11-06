import { Color, Icon, LaunchType, MenuBarExtra, getPreferenceValues, launchCommand, showHUD } from "@raycast/api";
import { openCommand } from "./lib/launch";
import { useEffect, useState } from "react";
import { launchOnDevice, sendKey, turnOn } from "./lib/actions";
import { loadIcons } from "./lib/icons";
import { createClient } from "./lib/preferences";
import { describeRokuError } from "./lib/roku";
import { getSavedDevices, getSelectedDevice, selectDevice } from "./lib/storage";
import type { RokuApp, RokuDevice, RokuMediaPlayer } from "./lib/types";
import { formatTime, playerLabel } from "./hooks/useNowPlaying";

type State = {
  device?: RokuDevice;
  devices: RokuDevice[];
  info?: RokuDevice;
  app?: RokuApp;
  player?: RokuMediaPlayer;
  apps: RokuApp[];
  icons: Record<string, string>;
  error?: string;
};

export default function RokuMenuBar() {
  const { showAppInMenuBar } = getPreferenceValues<Preferences.MenuBar>();
  const [state, setState] = useState<State>({ devices: [], apps: [], icons: {} });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [devices, device] = await Promise.all([getSavedDevices(), getSelectedDevice()]);
      if (!device) {
        setState({ devices, apps: [], icons: {} });
        return;
      }
      const client = createClient(device);
      const [info, app, player, apps] = await Promise.allSettled([
        client.getDeviceInfo(),
        client.getActiveApp(),
        client.getMediaPlayer(),
        client.getApps(),
      ]);
      const appList = apps.status === "fulfilled" ? apps.value : [];
      const icons = await loadIcons(
        device,
        appList.slice(0, 12).map((a) => a.id),
      ).catch(() => ({}));
      setState({
        device,
        devices,
        info: info.status === "fulfilled" && info.value.id === device.id ? info.value : undefined,
        app: app.status === "fulfilled" ? app.value : undefined,
        player: player.status === "fulfilled" ? player.value : undefined,
        apps: appList,
        icons,
        error: info.status === "rejected" ? describeRokuError(info.reason) : undefined,
      });
    })()
      .catch((cause) => setState((s) => ({ ...s, error: describeRokuError(cause) })))
      .finally(() => setIsLoading(false));
  }, []);

  const { device, info, app, player } = state;
  const isOn = info?.powerMode === "PowerOn";
  const offline = Boolean(state.error);
  const title = showAppInMenuBar && isOn && app && app.id !== "home" ? app.name : undefined;
  const icon = { source: Icon.Monitor, tintColor: offline ? Color.SecondaryText : undefined };

  async function run(label: string, work: () => Promise<unknown>) {
    try {
      await work();
      await showHUD(`${label} → ${device?.name}`);
    } catch (cause) {
      await showHUD(`⚠️ ${describeRokuError(cause)}`);
    }
  }

  if (!device) {
    return (
      <MenuBarExtra icon={icon} isLoading={isLoading} tooltip="Roku Remote">
        <MenuBarExtra.Item title="Add a Roku TV…" icon={Icon.Plus} onAction={() => openCommand("manage-devices")} />
      </MenuBarExtra>
    );
  }

  const key = (label: string, k: string) => () => run(label, () => sendKey(device, k));
  const status = offline
    ? "Not reachable"
    : !isOn && info?.isTv
      ? "Standby"
      : [app?.name, playerLabel(player?.state), formatTime(player?.positionMs)].filter(Boolean).join(" · ");

  return (
    <MenuBarExtra icon={icon} title={title} isLoading={isLoading} tooltip={`Roku · ${device.name}`}>
      <MenuBarExtra.Section title={device.name}>
        <MenuBarExtra.Item
          title={status || "Connected"}
          icon={app && state.icons[app.id] ? { source: state.icons[app.id] } : Icon.Monitor}
          onAction={() => openCommand("roku-remote")}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Play / Pause" icon={Icon.Play} onAction={key("Play/Pause", "Play")} />
        <MenuBarExtra.Item
          title="Instant Replay"
          icon={Icon.RotateAntiClockwise}
          onAction={key("Replay", "InstantReplay")}
        />
        <MenuBarExtra.Item
          title="Home"
          icon={Icon.House}
          onAction={key("Home", "Home")}
          shortcut={{ modifiers: ["cmd"], key: "h" }}
        />
        <MenuBarExtra.Item title="Back" icon={Icon.ArrowCounterClockwise} onAction={key("Back", "Back")} />
      </MenuBarExtra.Section>
      {device.capabilities.volume !== false ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Volume Up"
            icon={Icon.SpeakerUp}
            onAction={key("Volume up", "VolumeUp")}
            shortcut={{ modifiers: ["cmd"], key: "=" }}
          />
          <MenuBarExtra.Item
            title="Volume Down"
            icon={Icon.SpeakerDown}
            onAction={key("Volume down", "VolumeDown")}
            shortcut={{ modifiers: ["cmd"], key: "-" }}
          />
          <MenuBarExtra.Item
            title="Mute / Unmute"
            icon={Icon.SpeakerOff}
            onAction={key("Mute", "VolumeMute")}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
          />
        </MenuBarExtra.Section>
      ) : null}
      {state.apps.length ? (
        <MenuBarExtra.Submenu title="Open App" icon={Icon.AppWindowGrid3x3}>
          {state.apps.map((a) => (
            <MenuBarExtra.Item
              key={a.id}
              title={a.name}
              icon={
                state.icons[a.id]
                  ? { source: state.icons[a.id] }
                  : a.id.startsWith("tvinput.")
                    ? Icon.Plug
                    : Icon.AppWindow
              }
              onAction={() => run(`Opening ${a.name}`, () => launchOnDevice(device, a.id, { name: a.name }))}
            />
          ))}
        </MenuBarExtra.Submenu>
      ) : null}
      <MenuBarExtra.Section>
        {info?.isTv || device.capabilities.power ? (
          isOn ? (
            <MenuBarExtra.Item title="Turn TV Off" icon={Icon.Power} onAction={key("Power off", "PowerOff")} />
          ) : (
            <MenuBarExtra.Item
              title="Turn TV On"
              icon={Icon.Power}
              onAction={() => run("Power on", () => turnOn(device))}
            />
          )
        ) : null}
        {state.devices.length > 1 ? (
          <MenuBarExtra.Submenu title="Switch TV" icon={Icon.Switch}>
            {state.devices.map((d) => (
              <MenuBarExtra.Item
                key={d.id}
                title={d.name}
                icon={d.id === device.id ? Icon.CheckCircle : Icon.Circle}
                onAction={async () => {
                  await selectDevice(d.id);
                  await launchCommand({ name: "menu-bar", type: LaunchType.Background }).catch(() => undefined);
                }}
              />
            ))}
          </MenuBarExtra.Submenu>
        ) : null}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open Remote…" icon={Icon.Mouse} onAction={() => openCommand("roku-remote")} />
        <MenuBarExtra.Item
          title="Search Movies & Shows…"
          icon={Icon.MagnifyingGlass}
          onAction={() => openCommand("search-roku")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
