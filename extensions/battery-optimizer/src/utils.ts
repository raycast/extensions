import { showHUD } from "@raycast/api";
import { execSync } from "node:child_process";
import { bclmPath, confirmAlertBrew } from "./utils/initBCLM";
import { preferences } from "./utils/getPreference";
import { confirmAlertPersist } from "./utils/confirmAlertPersist";

export async function getChargeThreshold(HUDMessage?: string) {
  const detectBrew = await confirmAlertBrew();

  if (!detectBrew) {
    return ""; // Return if bclm is not detected and user does not confirm installation
  }

  const batteryLevel = execSync(`${bclmPath()} read`).toString().trim();
  console.log((HUDMessage ?? "") + batteryLevel + "%");
  if (HUDMessage) {
    await showHUD(HUDMessage + batteryLevel + "%");
    console.log("end getChargeThreshold");
  }

  return batteryLevel;
}

export async function setBatteryThreshold(threshold: number, HUDMessage?: string) {
  const detectBrew = await confirmAlertBrew();

  if (!detectBrew) {
    return; // Return if bclm is not detected and user does not confirm installation
  }

  if (await confirmAlertPersist()) {
    return;
  }

  const addSystemService = preferences.add_system_service;
  const shellCommand = `${bclmPath()} write ${threshold} && ${bclmPath()} ${
    addSystemService && threshold === 80 ? "persist" : "unpersist"
  }`;
  await showHUD("Administrator Privileges Required");

  const osaCommand = `/usr/bin/osascript -e 'do shell script "${shellCommand}" with prompt "Administrator Privileges Required" with administrator privileges'`;
  try {
    execSync(osaCommand, { shell: "/bin/zsh" });
    await getChargeThreshold(HUDMessage);
  } catch (e) {
    console.log(e);
    await showHUD("Error Setting Battery Threshold");
  }
}
