import { launchCommand, LaunchType } from "@raycast/api";

// After any mutation, nudge the menu bar so it reflects the change within a
// second instead of at the next 1-minute tick.
export async function refreshMenuBar(): Promise<void> {
  try {
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
  } catch {
    // Throws when the menu bar command is disabled — nothing to refresh then.
  }
}
