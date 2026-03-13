import { showHUD } from "@raycast/api";
import { execSync } from "child_process";
import { checkAdbDeviceExists } from "./utils";

export default async function toggleLayoutBounds() {
  let adbDir: string;
  try {
    adbDir = await checkAdbDeviceExists();
  } catch (e) {
    await showHUD(`${e}`);
    return;
  }
  const enabled = execSync(`${adbDir} shell getprop debug.layout`).toString().trim() === "true";
  if (enabled) {
    await showHUD("📏 Disabling layout bounds");
  } else {
    await showHUD("📏 Enabling layout bounds");
  }
  execSync(`${adbDir} shell setprop debug.layout ${!enabled}`);
  execSync(`${adbDir} shell service call activity 1599295570`);
}
