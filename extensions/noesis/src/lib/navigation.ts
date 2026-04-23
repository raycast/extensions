import { launchCommand, LaunchType } from "@raycast/api";

export function openCommand(commandName: string): Promise<void> {
  return launchCommand({ name: commandName, type: LaunchType.UserInitiated });
}
