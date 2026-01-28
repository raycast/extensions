import { showHUD } from "@raycast/api";
import { execSync } from "child_process";
import { checkAdbDeviceExists } from "./utils";

export default async function developerSettings() {
  let adbDir: string;
  try {
    adbDir = await checkAdbDeviceExists();
  } catch (e) {
    await showHUD(`${e}`);
    return;
  }
  await showHUD("🌍 Opening developer settings");
  execSync(`${adbDir} shell am start -a android.settings.APPLICATION_DEVELOPMENT_SETTINGS`);
}
