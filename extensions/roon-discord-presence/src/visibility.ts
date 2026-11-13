import { Cache, launchCommand, LaunchType } from "@raycast/api";

// Extensions can't change their own preferences, so the "hide menu bar icon" switch lives in the
// extension's Cache, which is synchronous (no flicker) and shared by all of its commands.
const cache = new Cache();
const KEY = "menuBarHidden";

export function isMenuBarHidden(): boolean {
  return cache.get(KEY) === "true";
}

export async function setMenuBarHidden(hidden: boolean, refresh = true): Promise<void> {
  cache.set(KEY, String(hidden));
  if (!refresh) return;
  try {
    // re-render the menu bar command now instead of at its next 10 s refresh
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
  } catch {
    // the menu bar command is disabled in Raycast Settings; nothing to refresh
  }
}
