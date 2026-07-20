import { AppleTVConnection, RemoteKey, sendKey } from "@bharper/atv-js";
import { withConnection } from "../lib/connection";
import { appSwitcher, controlCenter, longPressSelect, skipBy, startScreensaver } from "../lib/companion-extras";

type Input = {
  /**
   * The remote action to perform. One of: up, down, left, right, select, menu, home,
   * play_pause, volume_up, volume_down, next, previous, context_menu (long-press
   * select), app_switcher, control_center, screensaver, skip_forward, skip_backward
   */
  key: string;
};

const VALID_KEYS = new Set<string>(Object.values(RemoteKey));

// EXTRAS intentionally shadows the enum's skip keys, the MediaControl path works; the key-press mapping doesn't.
const EXTRAS: Record<string, (conn: AppleTVConnection) => Promise<void>> = {
  context_menu: longPressSelect,
  long_press_select: longPressSelect,
  app_switcher: appSwitcher,
  control_center: controlCenter,
  screensaver: startScreensaver,
  skip_forward: (conn) => skipBy(conn, 10),
  skip_backward: (conn) => skipBy(conn, -10),
};

/**
 * Press a single button on the Apple TV remote (navigation, playback, volume),
 * or perform a remote gesture: context_menu (long-press select), app_switcher,
 * control_center, screensaver, skip_forward/skip_backward.
 */
export default async function tool(input: Input): Promise<string> {
  const key = input.key.trim().toLowerCase();

  try {
    const extra = EXTRAS[key];
    if (extra) {
      await withConnection(extra);
      return `Done: ${key.replace(/_/g, " ")}`;
    }
    if (!VALID_KEYS.has(key)) {
      return `Invalid key "${input.key}". Valid: ${[...VALID_KEYS, ...Object.keys(EXTRAS)].join(", ")}.`;
    }
    await withConnection((conn) => sendKey(conn, key));
    return `Pressed ${key}`;
  } catch (error) {
    return `Failed to press ${key}: ${error instanceof Error ? error.message : String(error)}`;
  }
}
