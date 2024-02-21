import { showHUD } from "@raycast/api";
import { execSync } from "child_process";
import checkAdbExists from "./utils";

export default async function airplane() {
  let adbDir: string;
  try {
    adbDir = await checkAdbExists();
  } catch (e) {
    await showHUD(`${e}`);
    return;
  }
  const enabled = execSync(`${adbDir} shell settings get global airplane_mode_on`).toString().trim() === "1";
  let toggleValue;
  if (enabled) {
    toggleValue = "disable";
    await showHUD("✈️ Turning off airplane mode");
  } else {
    toggleValue = "enable";
    await showHUD("✈️ Turning on airplane mode");
  }
  execSync(`${adbDir} shell cmd connectivity airplane-mode ${toggleValue}`);
}
