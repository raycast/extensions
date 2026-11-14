import { LaunchType, launchCommand } from "@raycast/api";

export const MENU_BAR_COMMAND = "menu-bar-favorites";

/** Redraws the menu bar after favorites change; does nothing when the person has not turned it on. */
export function refreshMenuBar(): void {
  launchCommand({ name: MENU_BAR_COMMAND, type: LaunchType.Background }).catch(() => {
    // The menu bar command is inactive.
  });
}
