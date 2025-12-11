import { LaunchType, launchCommand } from "@raycast/api";

export async function launchMatchDetailCommand(matchId: string | number) {
  try {
    await launchCommand({
      name: "match-detail",
      type: LaunchType.UserInitiated,
      arguments: {
        matchId: matchId.toString(),
      },
    });
  } catch (error) {
    console.error("Failed to launch match detail command:", error);
  }
}
