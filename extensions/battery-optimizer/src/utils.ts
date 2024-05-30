import { showHUD } from "@raycast/api";
import { execSync } from "node:child_process";
import { bclmPath, confirmAlertBrew } from "./utils/initBCLM";
import { add_system_service } from "./utils/getPreference";
import { confirmAlertPersist } from "./utils/confirmAlertPersist";

export async function getChargeThreshold(HUDMessage?: string) {
  const detect_brew = await confirmAlertBrew();
  if (typeof detect_brew === "boolean") {
    return;
  }

  const batteryLevel = execSync(`${bclmPath()} read`).toString().trim();
  console.log(HUDMessage + batteryLevel + "%");
  if (HUDMessage) {
    await showHUD(HUDMessage + batteryLevel + "%");
    console.log("end getChargeThreshold");
  }
}

export async function setBatteryThreshold(threshold: number, HUDMessage?: string) {
  const detect_brew = await confirmAlertBrew();
  if (typeof detect_brew === "boolean") {
    return;
  }

  if (await confirmAlertPersist()) {
    return;
  }

  const shellCommand = `${bclmPath()} write ${threshold} && ${bclmPath()} ${add_system_service() && threshold === 80 ? "persist" : "unpersist"}`;
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
