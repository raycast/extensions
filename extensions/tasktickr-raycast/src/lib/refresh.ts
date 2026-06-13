import { LaunchType, launchCommand } from "@raycast/api";

/** Refresh the menu bar command after a mutation. No-op if it is disabled. */
export async function refreshMenuBar(): Promise<void> {
  try {
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
  } catch {
    // Menu bar command not enabled — nothing to refresh.
  }
}
