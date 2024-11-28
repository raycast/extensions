import { launchCommand, LaunchType } from "@raycast/api";

export default async function largeFontLargeDisplay() {
  await launchCommand({ name: "adb-font-size", type: LaunchType.UserInitiated, arguments: { factor: "1.3" } });
  await launchCommand({ name: "adb-display-size", type: LaunchType.UserInitiated, arguments: { factor: "3.0" } });
}
