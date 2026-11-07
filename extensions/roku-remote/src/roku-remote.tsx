import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Image,
  Keyboard,
  LaunchType,
  List,
  Toast,
  launchCommand,
  showToast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { launchOnDevice, sendKey, sendKeyRepeated, turnOn, typeOnDevice } from "./lib/actions";
import { restorePrevious } from "./lib/automation";
import { loadIcons } from "./lib/icons";
import { createClient } from "./lib/preferences";
import { describeRokuError } from "./lib/roku";
import { selectDevice } from "./lib/storage";
import type { RokuApp, RokuDevice } from "./lib/types";
import { formatTime, playerLabel, useNowPlaying } from "./hooks/useNowPlaying";
import ManageDevices from "./manage-devices";
import { AppsForDevice } from "./launch-app";
import { TypeTextForDevice } from "./type-text";
import { SearchRokuForm } from "./search-roku";
import RokuRoutines from "./roku-routines";
import TVDashboard from "./tv-dashboard";
import InstructionsSettings from "./roku-instructions";
import { ConnectionHelp } from "./components/ConnectionHelp";
import { DeviceDropdown, DeviceSetup } from "./components/DeviceSetup";
import { useDevices } from "./components/useDevices";

type Control = {
  id: string;
  title: string;
  key: string;
  icon: Image.ImageLike;
  /** Characters that trigger this control in keyboard mode. */
  keys: string[];
  shortcut?: Keyboard.Shortcut;
};

const NAVIGATION: Control[] = [
  {
    id: "up",
    title: "Up",
    key: "Up",
    icon: Icon.ArrowUp,
    keys: ["w", "k"],
    shortcut: { modifiers: ["opt"], key: "arrowUp" },
  },
  {
    id: "down",
    title: "Down",
    key: "Down",
    icon: Icon.ArrowDown,
    keys: ["s", "j"],
    shortcut: { modifiers: ["opt"], key: "arrowDown" },
  },
  {
    id: "left",
    title: "Left",
    key: "Left",
    icon: Icon.ArrowLeft,
    keys: ["a", "h"],
    shortcut: { modifiers: ["opt"], key: "arrowLeft" },
  },
  {
    id: "right",
    title: "Right",
    key: "Right",
    icon: Icon.ArrowRight,
    keys: ["d", "l"],
    shortcut: { modifiers: ["opt"], key: "arrowRight" },
  },
  {
    id: "ok",
    title: "OK",
    key: "Select",
    icon: Icon.CircleFilled,
    keys: [" ", "e"],
    shortcut: { modifiers: ["opt"], key: "return" },
  },
  {
    id: "back",
    title: "Back",
    key: "Back",
    icon: Icon.ArrowCounterClockwise,
    keys: ["q", "b"],
    shortcut: { modifiers: ["opt"], key: "backspace" },
  },
  {
    id: "home",
    title: "Home",
    key: "Home",
    icon: Icon.House,
    keys: ["g", "0"],
    shortcut: { modifiers: ["opt"], key: "h" },
  },
  {
    id: "options",
    title: "Options (✱)",
    key: "Info",
    icon: Icon.Ellipsis,
    keys: ["i", "*"],
    shortcut: { modifiers: ["opt"], key: "i" },
  },
];

const PLAYBACK: Control[] = [
  {
    id: "play",
    title: "Play / Pause",
    key: "Play",
    icon: Icon.Play,
    keys: ["p"],
    shortcut: { modifiers: ["opt"], key: "p" },
  },
  {
    id: "rev",
    title: "Rewind",
    key: "Rev",
    icon: Icon.Rewind,
    keys: ["r", ","],
    shortcut: { modifiers: ["opt"], key: "," },
  },
  {
    id: "fwd",
    title: "Fast Forward",
    key: "Fwd",
    icon: Icon.Forward,
    keys: ["f", "."],
    shortcut: { modifiers: ["opt"], key: "." },
  },
  { id: "replay", title: "Instant Replay", key: "InstantReplay", icon: Icon.RotateAntiClockwise, keys: ["z"] },
  { id: "search", title: "Roku Search Key", key: "Search", icon: Icon.MagnifyingGlass, keys: ["/"] },
];

const VOLUME: Control[] = [
  {
    id: "vol-up",
    title: "Volume Up",
    key: "VolumeUp",
    icon: Icon.SpeakerUp,
    keys: ["=", "+"],
    shortcut: { modifiers: ["opt"], key: "=" },
  },
  {
    id: "vol-down",
    title: "Volume Down",
    key: "VolumeDown",
    icon: Icon.SpeakerDown,
    keys: ["-", "_"],
    shortcut: { modifiers: ["opt"], key: "-" },
  },
  {
    id: "mute",
    title: "Mute / Unmute",
    key: "VolumeMute",
    icon: Icon.SpeakerOff,
    keys: ["m"],
    shortcut: { modifiers: ["opt"], key: "m" },
  },
];

const KEY_LEGEND = [
  ["W A S D  ·  H J K L", "Navigate"],
  ["Space  ·  E", "OK"],
  ["Q  ·  B", "Back"],
  ["G  ·  0", "Home"],
  ["P", "Play / Pause"],
  ["R  ·  F", "Rewind / Fast Forward"],
  ["Z", "Instant Replay"],
  ["I  ·  *", "Options"],
  ["+  ·  −  ·  M", "Volume / Mute"],
  ["/", "Roku Search"],
];

type Mode = "remote" | "text";

export default function RokuRemote() {
  const saved = useDevices();
  if (!saved.device) return <DeviceSetup {...saved} />;
  return (
    <RemoteForDevice
      key={saved.device.id}
      device={saved.device}
      devices={saved.devices}
      selectedId={saved.selectedId}
      choose={saved.choose}
      reloadDevices={saved.reload}
    />
  );
}

function RemoteForDevice({
  device,
  devices,
  selectedId,
  choose,
  reloadDevices,
}: {
  device: RokuDevice;
  devices: RokuDevice[];
  selectedId?: string;
  choose: (id: string) => Promise<void>;
  reloadDevices: () => Promise<void>;
}) {
  const now = useNowPlaying(device);
  const [mode, setMode] = useState<Mode>("remote");
  const [searchText, setSearchText] = useState("");
  const typed = useRef("");
  // Text edits are sent in order. A failed edit ends the session and drops queued
  // edits, because later diffs would be based on text the TV never received.
  const textQueue = useRef<Promise<void>>(Promise.resolve());
  const textSession = useRef(0);
  const [lastSent, setLastSent] = useState<string>();
  const [apps, setApps] = useState<RokuApp[]>([]);
  const [icons, setIcons] = useState<Record<string, string>>({});

  const target: RokuDevice =
    now.info?.id === device.id ? { ...now.info, name: device.name, host: device.host } : device;
  const limited = ["limited", "disabled"].includes(target.controlMode?.toLowerCase() ?? "");
  const problem = limited ? "Enable network control in Roku Settings before sending commands." : now.error;

  // Load the home-screen app order once, then the icons in the background.
  useEffect(() => {
    let cancelled = false;
    createClient(device)
      .getApps()
      .then(async (list) => {
        if (cancelled) return;
        setApps(list);
        const loaded = await loadIcons(
          device,
          list.map((app) => app.id),
        );
        if (!cancelled) setIcons(loaded);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [device.id, device.host]);

  const fail = useCallback(async (title: string, cause: unknown) => {
    await showFailureToast(describeRokuError(cause), { title });
  }, []);

  /** Keys are queued in order and acknowledged in the UI, without a toast per press. */
  const press = useCallback(
    (control: Pick<Control, "title" | "key">, times = 1) => {
      setLastSent(times > 1 ? `${control.title} ×${times}` : control.title);
      const work = times > 1 ? sendKeyRepeated(target, control.key, times) : sendKey(target, control.key);
      work.catch((cause) => fail(`Couldn't send ${control.title}`, cause));
    },
    [target.id, target.host, target.capabilities.volume, target.capabilities.power],
  );

  const keyMap = useRef(new Map<string, Control>());
  keyMap.current = new Map(
    [...NAVIGATION, ...PLAYBACK, ...(target.capabilities.volume === false ? [] : VOLUME)].flatMap((control) =>
      control.keys.map((char) => [char, control] as const),
    ),
  );

  function onSearchTextChange(text: string) {
    if (mode === "remote") {
      for (const char of text) {
        const control = keyMap.current.get(char.toLowerCase()) ?? keyMap.current.get(char);
        if (control) press(control);
      }
      setSearchText("");
      return;
    }
    // Text mode mirrors the search bar into the TV's text field, live.
    const previous = typed.current;
    let common = 0;
    while (common < previous.length && common < text.length && previous[common] === text[common]) common++;
    const backspaces = [...previous.slice(common)].length;
    const added = text.slice(common);
    typed.current = text;
    setSearchText(text);
    if (!backspaces && !added) return;
    setLastSent(added ? `Typed “${added}”` : `Deleted ${backspaces}`);
    const session = textSession.current;
    textQueue.current = textQueue.current.then(async () => {
      if (session !== textSession.current) return;
      try {
        await typeOnDevice(target, { backspaces, text: added });
      } catch (cause) {
        if (session !== textSession.current) return;
        textSession.current += 1;
        typed.current = "";
        setSearchText("");
        setLastSent(undefined);
        await fail("Couldn't type on TV. Text mode was reset; check the TV's text field before typing again", cause);
      }
    });
  }

  function switchMode(next: Mode) {
    setMode(next);
    textSession.current += 1;
    typed.current = "";
    setSearchText("");
    setLastSent(next === "text" ? "Text mode: typing goes to the TV" : "Remote mode");
  }

  function submitText() {
    typeOnDevice(target, { enter: true }).catch((cause) => fail("Couldn't press Enter", cause));
    typed.current = "";
    setSearchText("");
    setLastSent("Enter");
  }

  async function powerOn() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Turning TV on…", message: target.name });
    try {
      const confirmed = await turnOn(target);
      toast.style = Toast.Style.Success;
      toast.title = confirmed ? "TV is on" : "Wake request sent";
      toast.message = confirmed ? target.name : "Power-on isn't confirmed yet. Check the TV.";
      void now.refresh();
    } catch (cause) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't turn TV on";
      toast.message = describeRokuError(cause);
    }
  }

  async function launch(app: RokuApp) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Opening ${app.name}…` });
    try {
      const result = await launchOnDevice(target, app.id, { name: app.name });
      toast.style = Toast.Style.Success;
      toast.title = result.confirmed ? `Opened ${app.name}` : "Launch command sent";
      toast.message = result.message;
      void now.refresh();
    } catch (cause) {
      toast.style = Toast.Style.Failure;
      toast.title = `Couldn't open ${app.name}`;
      toast.message = describeRokuError(cause);
    }
  }

  async function restore() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Restoring previous app or input…" });
    try {
      const result = await restorePrevious(target);
      toast.style = Toast.Style.Success;
      toast.title = result.confirmed ? "Restored" : "Restore command sent";
      toast.message = result.message;
    } catch (cause) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't restore";
      toast.message = describeRokuError(cause);
    }
  }

  async function openInstructions() {
    try {
      await selectDevice(target.id);
      await launchCommand({ name: "roku-command", type: LaunchType.UserInitiated });
    } catch (cause) {
      await fail("Couldn't open Roku Instructions", cause);
    }
  }

  // ---- Detail panel: what's on the TV + keyboard legend ----
  const appName = now.app?.name ?? (now.isLoading ? "Connecting…" : "Unknown");
  const stateLabel = playerLabel(now.player?.state);
  const position = formatTime(now.player?.positionMs);
  const duration = formatTime(now.player?.durationMs);
  const progress =
    now.player?.positionMs !== undefined && now.player.durationMs
      ? Math.max(0, Math.min(1, now.player.positionMs / now.player.durationMs))
      : undefined;
  const bar =
    progress !== undefined
      ? `${"▰".repeat(Math.round(progress * 20))}${"▱".repeat(20 - Math.round(progress * 20))}`
      : "";
  const markdown = [
    `## ${appName}`,
    stateLabel ? `**${stateLabel}**${now.player?.isLive ? " · Live" : ""}` : "",
    position ? `\`${position}\` ${bar} \`${duration ?? (now.player?.isLive ? "live" : "—")}\`` : "",
    problem ? `> ⚠️ ${problem}` : "",
    mode === "text"
      ? "---\n**Text mode** — whatever you type in the search bar is typed on the TV as you go. Delete removes characters. ↵ presses Enter. ⌘T returns to the remote."
      : "---\n**Keyboard remote** — just type. Keys are sent instantly; the search bar clears itself.\n\n" +
        KEY_LEGEND.map(([keys, label]) => `\`${keys}\` ${label}`).join("  \n"),
    lastSent ? `\n_Last sent: ${lastSent}_` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const detail = (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="TV"
            text={target.name}
            icon={{ source: Icon.Monitor, tintColor: problem ? Color.Orange : Color.Green }}
          />
          {now.app ? (
            <List.Item.Detail.Metadata.Label
              title="Now Showing"
              text={now.app.name}
              icon={now.icon ? { source: now.icon } : Icon.AppWindow}
            />
          ) : null}
          {target.powerMode ? (
            <List.Item.Detail.Metadata.Label
              title="Power"
              text={target.powerMode.replace(/([a-z])([A-Z])/g, "$1 $2")}
            />
          ) : null}
          {target.model ? <List.Item.Detail.Metadata.Label title="Model" text={target.model} /> : null}
          <List.Item.Detail.Metadata.Label title="Address" text={target.host} />
        </List.Item.Detail.Metadata>
      }
    />
  );

  // ---- Shared actions available from every row (so shortcuts work anywhere) ----
  const remoteShortcuts = (
    <ActionPanel.Section title="Remote">
      {[...NAVIGATION, ...PLAYBACK, ...(target.capabilities.volume === false ? [] : VOLUME)]
        .filter((control) => control.shortcut)
        .map((control) => (
          <Action
            key={control.id}
            title={control.title}
            icon={control.icon}
            shortcut={control.shortcut}
            onAction={() => press(control)}
          />
        ))}
    </ActionPanel.Section>
  );

  const tools = (
    <ActionPanel.Section title="TV Tools">
      <Action
        title={mode === "remote" ? "Switch to Text Mode" : "Switch to Remote Mode"}
        icon={mode === "remote" ? Icon.Keyboard : Icon.Mouse}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        onAction={() => switchMode(mode === "remote" ? "text" : "remote")}
      />
      <Action.Push
        title="Apps and TV Inputs"
        icon={Icon.AppWindowGrid3x3}
        shortcut={Keyboard.Shortcut.Common.Open}
        target={<AppsForDevice device={target} navigationTitle={`${target.name} · Apps & Inputs`} />}
      />
      <Action.Push
        title="Search Movies & Shows"
        icon={Icon.MagnifyingGlass}
        shortcut={{ modifiers: ["cmd"], key: "f" }}
        target={<SearchRokuForm device={target} navigationTitle={`${target.name} · Search`} />}
      />
      <Action.Push
        title="Send a Block of Text"
        icon={Icon.Text}
        shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
        target={<TypeTextForDevice device={target} navigationTitle={`${target.name} · Type Text`} />}
      />
      <Action title="Restore Previous App or Input" icon={Icon.Undo} onAction={restore} />
      <Action
        title="Refresh Status"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => void now.refresh()}
      />
      <Action.Push title="Roku Routines" icon={Icon.List} target={<RokuRoutines navigationTitle="Roku Routines" />} />
      <Action.Push
        title="TV Dashboard"
        icon={Icon.Desktop}
        target={<TVDashboard navigationTitle="Roku TV Dashboard" />}
      />
      <Action title="Roku Instructions" icon={Icon.TextInput} onAction={openInstructions} />
      <Action.Push
        title="Edit Room and App Aliases"
        icon={Icon.Gear}
        target={<InstructionsSettings navigationTitle="Roku Instruction Settings" />}
      />
      <Action.Push
        title="Manage TVs"
        icon={Icon.Gear}
        target={<ManageDevices onChanged={reloadDevices} navigationTitle="Manage Roku TVs" />}
      />
      <Action.Push
        title="Connection Help"
        icon={Icon.QuestionMarkCircle}
        target={<ConnectionHelp device={target} message={problem} />}
      />
    </ActionPanel.Section>
  );

  function controlItem(control: Control, repeats: number[] = []) {
    return (
      <List.Item
        key={control.id}
        id={control.id}
        title={control.title}
        icon={control.icon}
        keywords={control.keys}
        // The detail pane hides accessories, so key hints go in the subtitle.
        subtitle={control.keys.map((k) => (k === " " ? "Space" : k.toUpperCase())).join(" · ")}
        detail={detail}
        actions={
          <ActionPanel>
            <Action title={`Send ${control.title}`} icon={control.icon} onAction={() => press(control)} />
            {repeats.map((times) => (
              <Action
                key={times}
                title={`${control.title} ×${times}`}
                icon={control.icon}
                onAction={() => press(control, times)}
              />
            ))}
            {remoteShortcuts}
            {tools}
          </ActionPanel>
        }
      />
    );
  }

  const quickApps = apps.filter((app) => !app.id.startsWith("tvinput.")).slice(0, 8);
  const inputs = apps.filter((app) => app.id.startsWith("tvinput."));
  const showPower =
    target.capabilities.power !== false && (target.capabilities.power || target.isTv || target.macs?.length);

  return (
    <List
      isShowingDetail
      filtering={false}
      searchText={searchText}
      onSearchTextChange={onSearchTextChange}
      isLoading={now.isLoading}
      searchBarPlaceholder={
        mode === "text"
          ? "Type here — it appears on your TV as you type…"
          : "Press keys to control the TV (W A S D, Space, Q, P…)"
      }
      searchBarAccessory={<DeviceDropdown devices={devices} selectedId={selectedId} choose={choose} />}
    >
      {mode === "text" ? (
        <List.Section title="Text Mode">
          <List.Item
            title="Press Enter on TV"
            subtitle={searchText ? `“${searchText}”` : "Type in the search bar"}
            icon={Icon.Keyboard}
            detail={detail}
            actions={
              <ActionPanel>
                <Action title="Press Enter on TV" icon={Icon.Keyboard} onAction={submitText} />
                <Action
                  title="Clear What I Typed on TV"
                  icon={Icon.DeleteDocument}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={() => onSearchTextChange("")}
                />
                {remoteShortcuts}
                {tools}
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      {problem ? (
        <List.Section title="Connection">
          <List.Item
            title={limited ? "Enable Network Control" : "TV isn't responding"}
            subtitle={limited ? `Roku reports ${target.controlMode} mode` : "Keys are still sent if it wakes up"}
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            detail={detail}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Connection Help"
                  icon={Icon.QuestionMarkCircle}
                  target={<ConnectionHelp device={target} message={problem} />}
                />
                {showPower ? <Action title="Power on TV" icon={Icon.Power} onAction={powerOn} /> : null}
                <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={() => void now.refresh()} />
                {tools}
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      <List.Section title="Navigate">{NAVIGATION.map((control) => controlItem(control))}</List.Section>
      <List.Section title="Playback">{PLAYBACK.map((control) => controlItem(control))}</List.Section>

      {target.capabilities.volume !== false ? (
        <List.Section title="Volume">
          {VOLUME.map((control) => controlItem(control, control.key === "VolumeMute" ? [] : [5, 10]))}
        </List.Section>
      ) : null}

      {quickApps.length ? (
        <List.Section title="Quick Launch" subtitle="Your home-screen order">
          {[...quickApps, ...inputs].map((app) => (
            <List.Item
              key={app.id}
              title={app.name}
              icon={
                icons[app.id] ? { source: icons[app.id] } : app.id.startsWith("tvinput.") ? Icon.Plug : Icon.AppWindow
              }
              subtitle={now.app?.id === app.id ? "On Now" : undefined}
              detail={detail}
              actions={
                <ActionPanel>
                  <Action title={`Open ${app.name}`} icon={Icon.Play} onAction={() => launch(app)} />
                  {remoteShortcuts}
                  {tools}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}

      {showPower || target.capabilities.findRemote ? (
        <List.Section title="Power & Remote">
          {showPower ? (
            <List.Item
              title="Turn TV On"
              icon={{ source: Icon.Power, tintColor: Color.Green }}
              detail={detail}
              actions={
                <ActionPanel>
                  <Action title="Power on TV" icon={Icon.Power} onAction={powerOn} />
                  {tools}
                </ActionPanel>
              }
            />
          ) : null}
          {target.capabilities.power
            ? controlItem({
                id: "off",
                title: "Turn TV Off",
                key: "PowerOff",
                icon: { source: Icon.Power, tintColor: Color.Red },
                keys: [],
              })
            : null}
          {target.capabilities.findRemote
            ? controlItem({ id: "find", title: "Find My Remote", key: "FindRemote", icon: Icon.Bell, keys: [] })
            : null}
        </List.Section>
      ) : null}

      <List.Section title="More">
        {(
          [
            [
              "Switch to Text Mode",
              Icon.Keyboard,
              "Type live into TV search fields",
              () => switchMode(mode === "remote" ? "text" : "remote"),
            ],
          ] as const
        ).map(([title, icon, subtitle, run]) => (
          <List.Item
            key={title}
            title={mode === "text" ? "Back to Remote Mode" : title}
            subtitle={subtitle}
            icon={icon}
            detail={detail}
            actions={
              <ActionPanel>
                <Action title={mode === "text" ? "Back to Remote Mode" : title} icon={icon} onAction={run} />
                {tools}
              </ActionPanel>
            }
          />
        ))}
        <List.Item
          title="Search Movies & Shows"
          icon={Icon.MagnifyingGlass}
          detail={detail}
          actions={
            <ActionPanel>
              <Action.Push
                title="Search Movies & Shows"
                icon={Icon.MagnifyingGlass}
                target={<SearchRokuForm device={target} navigationTitle={`${target.name} · Search`} />}
              />
              {tools}
            </ActionPanel>
          }
        />
        <List.Item
          title="All Apps and Inputs"
          icon={Icon.AppWindowGrid3x3}
          detail={detail}
          actions={
            <ActionPanel>
              <Action.Push
                title="All Apps and Inputs"
                icon={Icon.AppWindowGrid3x3}
                target={<AppsForDevice device={target} navigationTitle={`${target.name} · Apps & Inputs`} />}
              />
              {tools}
            </ActionPanel>
          }
        />
        <List.Item
          title="Routines, Dashboard & Settings"
          subtitle="⌘K for everything else"
          icon={Icon.Gear}
          detail={detail}
          actions={<ActionPanel>{tools}</ActionPanel>}
        />
      </List.Section>
    </List>
  );
}
