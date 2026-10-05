import { LaunchType, launchCommand } from "@raycast/api";

export function openProviderSetupCommand(): Promise<void> {
  return launchCommand({ name: "setup-voice-defaults", type: LaunchType.UserInitiated });
}
