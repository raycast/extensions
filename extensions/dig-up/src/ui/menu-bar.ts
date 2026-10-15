// Asks the menu-bar command to redraw now (after a pause, a sync), when it's turned on.

import { LaunchType, launchCommand } from "@raycast/api";

export async function refreshMenuBar(): Promise<void> {
  try {
    await launchCommand({ name: "status", type: LaunchType.Background });
  } catch {
    // The menu-bar command is off: nothing to redraw.
  }
}
