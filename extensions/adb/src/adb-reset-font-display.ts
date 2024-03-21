import { launchCommand, LaunchProps, LaunchType, showHUD } from "@raycast/api";
import { execSync } from "child_process";
import checkAdbExists from "./utils";
import displayDensity from "./adb-display-size";
import fontSize from "./adb-font-size";

export default async function resetFontDisplaySize() {
  await launchCommand({ name: "adb-font-size", type: LaunchType.UserInitiated, arguments: { factor: "1.0" } });
  await launchCommand({ name: "adb-display-size", type: LaunchType.UserInitiated, arguments: { factor: "1.0" } });
}
