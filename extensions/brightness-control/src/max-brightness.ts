import { showHUD, showToast, Toast } from "@raycast/api";
import { setBrightness } from "./utils/platform";

export default async function Command() {
  try {
    const result = await setBrightness(100);
    if (!result) return;

    if (result.displayName && result.brightness != null) {
      await showHUD(`🚀 ${result.displayName}: ${result.brightness}%`);
    } else if (result.displayName) {
      await showHUD(`🚀 ${result.displayName}: Brightness to the max!`);
    } else {
      await showHUD("🚀 Brightness to the max!");
    }
  } catch (error) {
    console.error("Failed to set max brightness:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Set Brightness",
      message: error instanceof Error ? error.message : "An error occurred",
    });
  }
}
