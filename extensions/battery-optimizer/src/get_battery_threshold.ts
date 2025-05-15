import { getChargeThreshold } from "./utils";
import { showHUD } from "@raycast/api";
import { getBatteryTool } from "./utils/batteryTools";
import { BatteryTool } from "./utils/getPreference";

export default async () => {
  const batteryTool = getBatteryTool();

  if (batteryTool === BatteryTool.BCLM) {
    await getChargeThreshold("🔋 Charging threshold：");
  } else {
    await showHUD("This command is for BCLM only. Please use Battery Status View for BATT.");
  }
};
