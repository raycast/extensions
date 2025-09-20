import { LaunchType, launchCommand } from "@raycast/api";

export function launchTeamCommand(teamId: string) {
  return launchCommand({
    name: "team",
    type: LaunchType.UserInitiated,
    arguments: { teamId },
  });
}
