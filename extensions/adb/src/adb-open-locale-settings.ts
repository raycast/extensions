import { showHUD } from "@raycast/api";
import { execSync } from "child_process";
import { checkAdbDeviceExists } from "./utils";

export default async function locationSettings() {
  let adbDir: string;
  try {
    adbDir = await checkAdbDeviceExists();
  } catch (e) {
    await showHUD(`${e}`);
    return;
  }
  await showHUD("🌍 Opening locale settings");
  execSync(`${adbDir} shell am start -a android.settings.LOCALE_SETTINGS`);
}
