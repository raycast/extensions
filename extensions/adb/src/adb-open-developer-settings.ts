import { showHUD } from "@raycast/api";
import { execSync } from "child_process";
import checkAdbExists from "./utils";

export default async function developerSettings() {
  const adbDir = await checkAdbExists();
  await showHUD("🌍 Opening developer settings");
  execSync(`${adbDir} shell am start -a android.settings.APPLICATION_DEVELOPMENT_SETTINGS`);
}
