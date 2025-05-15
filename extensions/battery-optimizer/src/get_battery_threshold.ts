import { getChargeThreshold } from "./utils";
import { showHUD } from "@raycast/api";
import { getBatteryTool } from "./utils/batteryTools";

export default async () => {
  const batteryTool = getBatteryTool();

  if (batteryTool === "bclm") {
    await getChargeThreshold("🔋 Charging threshold：");
  } else {
    await showHUD("This command is for BCLM only. Please use Battery Status View for BATT.");
  }
};
