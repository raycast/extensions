import { runAppleScript, showFailureToast } from "@raycast/utils";
import { showHUD } from "@raycast/api";
import { exec, execSync } from "child_process";
import { sudoSupportsTouchId } from "./sudoSupport";

const NORMAL_POWER_MODE = "0";
const LOW_POWER_MODE = "1";
// const HIGH_POWER_MODE = "2"; // unused for now

async function runWithPrivileges(command: string): Promise<void> {
  if (sudoSupportsTouchId()) {
    await exec(`sudo ${command}`);
  } else {
    await runAppleScript(
      `on run argv
        do shell script item 1 of argv with administrator privileges
      end`,
      [command],
      { timeout: 60000 },
    );
  }
}

export function isLowPowerModeEnabled(): boolean | undefined {
  try {
    const result = execSync(`pmset -g | grep powermode`);
    const lowPowerModeValue = result.toString().trim().at(-1);

    return lowPowerModeValue === LOW_POWER_MODE;
  } catch (error) {
    showFailureToast(error, { title: "Could not determine the Low Power Mode state" });
  }
}

async function setLowPowerMode(enable: boolean): Promise<void> {
  try {
    const value = enable ? LOW_POWER_MODE : NORMAL_POWER_MODE;
    await showHUD("Administrator Privileges Required");
    // setting the value of `powermode` works just fine even on computers
    // where the key is `lowpowermode`
    await runWithPrivileges(`/usr/bin/pmset -a powermode ${value}`);
    await showHUD(`✅ Low Power Mode is turned ${enable ? "on" : "off"}`);
  } catch (error) {
    showFailureToast(error, { title: "Could not set Low Power Mode" });
  }
}

export async function toggleLowPowerMode(): Promise<void> {
  const lowPowerModeState = isLowPowerModeEnabled();
  await setLowPowerMode(!lowPowerModeState);
}
