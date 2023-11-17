import { runAppleScript, showFailureToast } from "@raycast/utils";
import { showHUD } from "@raycast/api";

import { execSync } from "child_process";

const LOW_POWER_MODE_ENABLED = "1";

export const isLowPowerModeEnabled = () => {
  try {
    const result = execSync("pmset -g | grep lowpowermode");
    const lowPowerModeValue = result.toString().trim().at(-1);
    return lowPowerModeValue === LOW_POWER_MODE_ENABLED;
  } catch (error) {
    showFailureToast(error, { title: "Could not determine the Low Power Mode state" });
  }
};

export const setLowPowerModeState = async (lowPowerMode: boolean) => {
  try {
    const value = lowPowerMode ? "1" : "0";
    await showHUD("Administrator Privileges Required");
    await runAppleScript(`do shell script "pmset -a lowpowermode ${value}" with administrator privileges`);
    await showHUD(`✅ Low Power Mode is turned ${lowPowerMode ? "on" : "off"}`);
  } catch (error) {
    showFailureToast(error, { title: "Could not Toggle Low Power Mode" });
  }
};
