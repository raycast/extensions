import { showHUD } from "@raycast/api";
import { execSync } from "child_process";

export default async function locationSettings() {
  const adbDir = `${process.env.HOME}/Library/Android/sdk/platform-tools/adb`;
  await showHUD("🌍 Opening locale settings");
  execSync(`${adbDir} shell am start -a android.settings.LOCALE_SETTINGS`);
}
