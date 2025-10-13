import { showHUD } from "@raycast/api";
import { execSync } from "node:child_process";
import { preferences, BatteryTool } from "./utils/getPreference";
import { confirmAlertPersist } from "./utils/confirmAlertPersist";
import {
  getBatteryTool,
  getBatteryToolPath,
  mapBatteryCommand,
  parseBatteryOutput,
  getBatteryStatus,
} from "./utils/batteryTools";

export async function getChargeThreshold(HUDMessage?: string): Promise<number | null> {
  try {
    // Use the getBatteryStatus function from batteryTools
    const rawOutput = await getBatteryStatus();
    const batteryLevel = parseBatteryOutput(rawOutput);

    console.log((HUDMessage ?? "") + batteryLevel + "%");
    if (HUDMessage) {
      await showHUD(HUDMessage + batteryLevel + "%");
      console.log("end getChargeThreshold");
    }

    return batteryLevel;
  } catch (e) {
    console.error("Error in getChargeThreshold:", e);
    if (HUDMessage) {
      await showHUD("Error Reading Battery Threshold");
    }
    return null;
  }
}

export async function setBatteryThreshold(threshold: number, HUDMessage?: string) {
  try {
    const toolPath = await getBatteryToolPath();
    if (!toolPath) {
      await showHUD("Battery management tool not found");
      return;
    }

    if (await confirmAlertPersist()) {
      return;
    }

    const batteryTool = getBatteryTool();
    const addSystemService = preferences.add_system_service;
    const writeCommand = mapBatteryCommand("write", threshold);
    const persistCommand = mapBatteryCommand(addSystemService && threshold === 80 ? "persist" : "unpersist");

    // Build the shell command, only include persist commands if they're not empty
    let shellCommand = `${toolPath} ${writeCommand}`;

    // For BCLM we need to run the persist/unpersist command
    // For BATT the limit command already persists settings
    if (batteryTool === BatteryTool.BCLM || (batteryTool === BatteryTool.BATT && persistCommand !== "")) {
      shellCommand += ` && ${toolPath} ${persistCommand}`;
    }

    await showHUD("Administrator Privileges Required");

    const osaCommand = `/usr/bin/osascript -e 'do shell script "${shellCommand}" with prompt "Administrator Privileges Required" with administrator privileges'`;

    execSync(osaCommand, { shell: "/bin/zsh" });

    // Wait a moment for the system to update the threshold value
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await getChargeThreshold(HUDMessage);
  } catch (e) {
    console.error("Error in setBatteryThreshold:", e);
    const errorMessage = e instanceof Error ? e.message : String(e);

    // Check if error is from permission denial vs other failures
    if (errorMessage.includes("User cancelled") || errorMessage.includes("User canceled")) {
      await showHUD("Administrator permission was cancelled");
    } else if (errorMessage.includes("authentication") || errorMessage.includes("privilege")) {
      await showHUD("Administrator privileges required");
    } else {
      await showHUD("Error Setting Battery Threshold");
    }
  }
}
