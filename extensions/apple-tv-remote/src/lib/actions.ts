import { AppleTVConnection, HidCommand, RemoteKey, sendKey } from "@bharper/atv-js";
import { showHUD } from "@raycast/api";
import { MediaControl, delay, mediaControl, pressHid, skipBy } from "./companion-extras";
import { withConnection } from "./connection";
import { showErrorToast } from "./errors";

/**
 * Every fire-and-forget action the remote supports, keyed by a stable id.
 * The per-key commands, Ask, the menu bar, the visual remote and the AI tools
 * all dispatch through this table, so adding an action here adds it everywhere.
 */
interface DeviceAction {
  run: (conn: AppleTVConnection) => Promise<void>;
  /** HUD shown after the action succeeds. */
  hud: string;
  /** Spoken/typed synonyms (the id itself, with spaces or hyphens for underscores, is always accepted). */
  phrases?: string[];
}

const key = (k: RemoteKey, hud: string, ...phrases: string[]): DeviceAction => ({
  run: (conn) => sendKey(conn, k),
  hud,
  phrases,
});

const hid = (command: HidCommand, hud: string, ...phrases: string[]): DeviceAction => ({
  run: (conn) => pressHid(conn, command),
  hud,
  phrases,
});

export const ACTIONS = {
  up: key(RemoteKey.Up, "⬆️ Up"),
  down: key(RemoteKey.Down, "⬇️ Down"),
  left: key(RemoteKey.Left, "⬅️ Left"),
  right: key(RemoteKey.Right, "➡️ Right"),
  select: key(RemoteKey.Select, "⏺ Select", "ok"),
  menu: key(RemoteKey.Menu, "↩️ Back", "back", "top menu"),
  home: key(RemoteKey.Home, "🏠 Home"),
  home_hold: key(RemoteKey.HomeHold, "🏠 Home (hold)"),
  guide: key(RemoteKey.Guide, "📺 Guide"),
  // The remote's button toggles; spoken "play" and "pause" mean one state, so a repeat changes nothing.
  play_pause: key(RemoteKey.PlayPause, "⏯ Play/Pause"),
  play: { run: (conn) => mediaControl(conn, MediaControl.Play), hud: "▶️ Play", phrases: ["resume", "unpause"] },
  pause: { run: (conn) => mediaControl(conn, MediaControl.Pause), hud: "⏸ Pause" },
  next: key(RemoteKey.Next, "⏭ Next", "skip"),
  previous: key(RemoteKey.Previous, "⏮ Previous"),
  volume_up: key(RemoteKey.VolumeUp, "🔊 Volume Up", "louder"),
  volume_down: key(RemoteKey.VolumeDown, "🔉 Volume Down", "quieter"),
  // The library's skip keys are incomplete upstream; the seconds path works.
  skip_forward: { run: (conn) => skipBy(conn, 10), hud: "⏩ +10s" },
  skip_backward: { run: (conn) => skipBy(conn, -10), hud: "⏪ -10s", phrases: ["skip back"] },
  // Physical remote: hold the clickpad.
  context_menu: {
    run: (conn) => pressHid(conn, HidCommand.Select, 1000),
    hud: "📋 Context Menu",
    phrases: ["hold select", "long press", "long press select"],
  },
  // Physical remote: double-press the TV button.
  app_switcher: {
    run: async (conn) => {
      await sendKey(conn, RemoteKey.Home);
      await delay(150);
      await sendKey(conn, RemoteKey.Home);
    },
    hud: "🗂 App Switcher",
    phrases: ["switcher", "multitask"],
  },
  // Not a Home hold over the protocol: pyatv sends a single HID PageDown.
  control_center: hid(HidCommand.PageDown, "🎛 Control Center"),
  // Known-flaky upstream (pyatv #2139).
  screensaver: hid(HidCommand.Screensaver, "🌌 Screensaver"),
  sleep: hid(HidCommand.Sleep, "😴 Sleeping", "turn off", "off"),
  wake: hid(HidCommand.Wake, "👋 Waking", "wake up", "turn on", "on"),
} satisfies Record<string, DeviceAction>;

export type ActionId = keyof typeof ACTIONS;
/** Sleep and wake change power state, so the AI routes them through the power tool, which confirms first. */
export type RemoteActionId = Exclude<ActionId, "sleep" | "wake">;

const normalize = (phrase: string) =>
  phrase
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

/** Resolve a user phrase ("volume up", "app-switcher", "pause") to an action id. */
export function findAction(phrase: string): ActionId | null {
  const wanted = normalize(phrase);
  if (Object.hasOwn(ACTIONS, wanted)) return wanted as ActionId;
  const entries = Object.entries(ACTIONS) as [ActionId, DeviceAction][];
  return entries.find(([, action]) => action.phrases?.some((p) => normalize(p) === wanted))?.[0] ?? null;
}

/** Run an action over a short-lived connection and confirm it in the HUD. */
export async function performAction(id: ActionId): Promise<void> {
  await withConnection(ACTIONS[id].run);
  await showHUD(ACTIONS[id].hud);
}

/** A complete no-view Raycast command for one action. */
export const actionCommand = (id: ActionId) => () => performAction(id).catch(showErrorToast);
