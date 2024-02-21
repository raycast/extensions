import { showHUD } from "@raycast/api";
import { execSync } from "child_process";
import checkAdbExists from "./utils";

export default async function locationSettings() {
  let adbDir: string;
  try {
    adbDir = await checkAdbExists();
  } catch (e) {
    await showHUD(`${e}`);
    return;
  }
  await showHUD("🌍 Opening locale settings");
  execSync(`${adbDir} shell am start -a android.settings.LOCALE_SETTINGS`);
}
