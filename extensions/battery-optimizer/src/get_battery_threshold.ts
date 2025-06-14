import { getChargeThreshold } from "./utils";
import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getBatteryTool } from "./utils/batteryTools";
import { BatteryTool } from "./utils/getPreference";

export default async () => {
  const batteryTool = getBatteryTool();

  if (batteryTool === BatteryTool.BCLM) {
    try {
      await getChargeThreshold("🔋 Charging threshold: ");
    } catch (error) {
      await showFailureToast(error, { title: "Could not get charge threshold" });
    }
  } else {
    await showHUD("This command is for BCLM only. Please use Battery Status View for BATT.");
  }
};
