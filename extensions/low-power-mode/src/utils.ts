import { runAppleScript, showFailureToast } from "@raycast/utils";
import { showHUD } from "@raycast/api";

import { execSync } from "child_process";

export const isLowPowerModeEnabled = () => {
  try {
    const result = execSync("pmset -g | grep lowpowermode | awk -F' ' '{ print$2 }'");
    const resultInString = result.toString().trim();
    return resultInString === "1";
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
