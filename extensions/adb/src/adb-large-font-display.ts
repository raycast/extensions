import { launchCommand, LaunchProps, LaunchType, showHUD } from "@raycast/api";
import { execSync } from "child_process";
import checkAdbExists from "./utils";
import displayDensity from "./adb-display-size";
import fontSize from "./adb-font-size";

export default async function largeFontLargeDisplay() {
  await launchCommand({ name: "adb-font-size", type: LaunchType.UserInitiated, arguments: { factor: "1.3" } });
  await launchCommand({ name: "adb-display-size", type: LaunchType.UserInitiated, arguments: { factor: "3.0" } });
}
