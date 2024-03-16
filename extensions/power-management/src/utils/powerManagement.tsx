import { runAppleScript, showFailureToast } from "@raycast/utils";
import { showHUD } from "@raycast/api";

import { execSync } from "child_process";

const NORMAL_POWER_MODE = "0";
const LOW_POWER_MODE = "1";
// const HIGH_POWER_MODE = "2"; // unused for now

export function isLowPowerModeEnabled(): boolean | undefined {
  try {
    const result = execSync(`pmset -g | grep powermode`);
    const lowPowerModeValue = result.toString().trim().at(-1);

    return lowPowerModeValue === LOW_POWER_MODE;
  } catch (error) {
    showFailureToast(error, { title: "Could not determine the Low Power Mode state" });
  }
}

export async function setLowPowerMode(enable: boolean): Promise<void> {
  try {
    const value = enable ? LOW_POWER_MODE : NORMAL_POWER_MODE;
    await showHUD("Administrator Privileges Required");
    // setting the value of `powermode` works just fine even on computers
    // where the key is `lowpowermode`
    await runAppleScript(`do shell script "pmset -a powermode ${value}" with administrator privileges`);
    await showHUD(`✅ Low Power Mode is turned ${enable ? "on" : "off"}`);
  } catch (error) {
    showFailureToast(error, { title: "Could not set Low Power Mode" });
  }
}

export async function toggleLowPowerMode(): Promise<void> {
  const lowPowerModeState = isLowPowerModeEnabled();
  await setLowPowerMode(!lowPowerModeState);
}
