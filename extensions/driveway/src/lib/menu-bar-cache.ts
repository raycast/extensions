import { LocalStorage, launchCommand, LaunchType } from "@raycast/api";

// The menu bar command keeps a snapshot so opening the menu is instant, and
// re-reads `mount` only once its interval has elapsed. A command that mounts or
// unmounts behind its back therefore leaves both the snapshot and the count in
// the menu bar stale until the next tick.
export const MENU_BAR_CACHE_KEY = "menu-bar-cache";

// Drops the snapshot and asks Raycast to re-run the menu bar command, so the
// count and the checkmarks catch up as soon as the work is done. Best effort:
// the menu bar command can be turned off in Preferences, which makes the launch
// throw, and nothing here is worth failing the caller over.
export async function refreshMenuBar(): Promise<void> {
  try {
    await LocalStorage.removeItem(MENU_BAR_CACHE_KEY);
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
  } catch (error) {
    console.error("menu bar refresh skipped", error);
  }
}
