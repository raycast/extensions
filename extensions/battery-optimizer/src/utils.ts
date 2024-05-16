import { environment, showHUD, getPreferenceValues, confirmAlert, openExtensionPreferences } from "@raycast/api";
import { execSync } from "node:child_process";
import { join } from "path";

function add_system_service(): boolean | undefined {
  const { add_system_service } = getPreferenceValues<Preferences>();
  return add_system_service;
}
console.log(add_system_service());

const bclm = join(environment.assetsPath, "binary/bclm");
console.log(bclm);
const setPermissions = async () => {
  return execSync(`/bin/chmod u+x ${bclm}`);
};

export async function getChargeThreshold(HUDMessage?: string) {
  await setPermissions();
  const batteryLevel = execSync(`${bclm} read`).toString().trim();
  console.log(HUDMessage + batteryLevel + "%");
  if (HUDMessage) {
    await showHUD(HUDMessage + batteryLevel + "%");
  }
}

export async function setBatteryThreshold(threshold: number, HUDMessage?: string) {
  if (add_system_service() === undefined) {
    return confirmAlert({
      title: "Does it take effect after restart?",
      message: "Add a system service to ensure that the configuration takes effect after each restart.",
      primaryAction: {
        title: "Yes",
        onAction: () => {
          openExtensionPreferences();
        },
      },
    });
  }
  await setPermissions();
  const shellCommand = `${bclm} write ${threshold} && ${bclm} ${add_system_service() && threshold === 80 ? "persist" : "unpersist"}`;

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
