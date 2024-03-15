import { showHUD } from "@raycast/api";
import { execSync } from "child_process";
import checkAdbExists from "./utils";

export default async function darkMode() {
  let adbDir: string;
  try {
    adbDir = await checkAdbExists();
  } catch (e) {
    await showHUD(`${e}`);
    return;
  }
  const currentMode = execSync(`${adbDir} shell settings get secure ui_night_mode`).toString().trim();
  let toggleValue;
  if (currentMode == "1" || currentMode == "null" || currentMode == "0") {
    toggleValue = "yes";
    await showHUD("🌗 Turning on dark-mode");
  } else if (currentMode == "2") {
    toggleValue = "no";
    await showHUD("🌗 Turning off dark-mode");
  } else {
    toggleValue = "auto";
    await showHUD("🌗 Setting auto dark-mode");
  }
  execSync(`${adbDir} shell "cmd uimode night ${toggleValue}"`);
}
