import { LaunchType, launchCommand } from "@raycast/api";

export async function launchPlayerCommand(playerId: string) {
  try {
    await launchCommand({
      name: "player",
      type: LaunchType.UserInitiated,
      arguments: { playerId },
    });
  } catch (error) {
    console.error("Failed to launch player command:", error);
  }
}
