import { LocalStorage, showHUD } from "@raycast/api";
import { execSync } from "node:child_process";
import { bclmPath, confirmAlertBrew, setPermissions } from "./utils/initBCLM";
import { add_system_service } from "./utils/getPreference";
import { confirmAlertPersist } from "./utils/confirmAlertPersist";

export async function getChargeThreshold(HUDMessage?: string) {
  await setPermissions();

  const detect_brew = await confirmAlertBrew();
  if (typeof detect_brew === "boolean") {
    return;
  }

  const batteryLevel = execSync(`${bclmPath()} read`).toString().trim();
  console.log(HUDMessage + batteryLevel + "%");
  if (HUDMessage) {
    await showHUD(HUDMessage + batteryLevel + "%");
  }
}

export async function setBatteryThreshold(threshold: number, HUDMessage?: string) {
  console.log("ConfirmedPersist:" + (await LocalStorage.getItem<string>("ConfirmedPersist")));
  if ((await LocalStorage.getItem<string>("ConfirmedPersist")) !== "true") {
    await confirmAlertPersist();
  }
  await setPermissions();

  const detect_brew = await confirmAlertBrew();
  console.log("confirmAlertBrew:" + detect_brew);
  if (typeof detect_brew === "boolean") {
    return;
  }

  const shellCommand = `${bclmPath()} write ${threshold} && ${bclmPath()} ${add_system_service() && threshold === 80 ? "persist" : "unpersist"}`;
  await showHUD("Administrator Privileges Required");
  const osaCommand = `osascript -e 'do shell script "${shellCommand}" with prompt "Administrator Privileges Required" with administrator privileges'`;
  console.log(osaCommand);
  try {
    execSync(osaCommand, { shell: "/bin/bash" });
    await getChargeThreshold(HUDMessage);
  } catch (e) {
    console.log(e);
    await showHUD("Error Setting Battery Threshold");
  }
}
