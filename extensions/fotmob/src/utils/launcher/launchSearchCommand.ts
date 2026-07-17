import { LaunchType, launchCommand } from "@raycast/api";

export async function launchSearchCommand() {
  try {
    await launchCommand({
      name: "favorite",
      type: LaunchType.UserInitiated,
    });
  } catch (error) {
    console.error("Failed to launch search command:", error);
  }
}
