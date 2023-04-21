import { LaunchType, launchCommand } from "@raycast/api";

export async function refreshMenuBarCommand() {
  await launchCommand({ name: "menu-bar", type: LaunchType.UserInitiated });
}
