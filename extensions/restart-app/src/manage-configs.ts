import { launchCommand, LaunchType } from "@raycast/api";

export default async function command() {
  // This is just a wrapper to launch the view-based command
  await launchCommand({ name: "manage-configs-view", type: LaunchType.UserInitiated });
}
