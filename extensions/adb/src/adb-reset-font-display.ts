import { launchCommand, LaunchType } from "@raycast/api";

export default async function resetFontDisplaySize() {
  await launchCommand({ name: "adb-font-size", type: LaunchType.UserInitiated, arguments: { factor: "1.0" } });
  await launchCommand({ name: "adb-display-size", type: LaunchType.UserInitiated, arguments: { factor: "1.0" } });
}
