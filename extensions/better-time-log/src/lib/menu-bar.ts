import { LaunchType, launchCommand } from "@raycast/api";

export async function refreshMenuBarCommand() {
  try {
    await launchCommand({ name: "start-time", type: LaunchType.Background });
  } catch {
    // Ignore failures (command might not be installed yet).
  }
}
