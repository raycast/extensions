import { LocalStorage } from "@raycast/api";
import { execSafe } from "./exec";

/** The last app that was seen playing, persisted so commands can reopen it when nothing is
 * active. Written by the menu-bar command on every refresh; read from any command via the
 * extension-wide LocalStorage. */
export interface LastPlayer {
  appName: string;
  bundleId?: string;
}

export const LAST_PLAYER_KEY = "lastPlayer";

export function parseLastPlayer(
  raw: string | undefined,
): LastPlayer | undefined {
  if (!raw) return undefined;
  try {
    const v = JSON.parse(raw) as LastPlayer;
    return typeof v?.appName === "string" ? v : undefined;
  } catch {
    return undefined;
  }
}

export async function readLastPlayer(): Promise<LastPlayer | undefined> {
  return parseLastPlayer(await LocalStorage.getItem<string>(LAST_PLAYER_KEY));
}

export async function writeLastPlayer(player: LastPlayer): Promise<void> {
  await LocalStorage.setItem(LAST_PLAYER_KEY, JSON.stringify(player));
}

/** Launch (or focus, if already running) the player's app. */
export function openPlayerApp(player: LastPlayer): void {
  const args = player.bundleId
    ? ["-b", player.bundleId]
    : ["-a", player.appName];
  void execSafe("open", args);
}
