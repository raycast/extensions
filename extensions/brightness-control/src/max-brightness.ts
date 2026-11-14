import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { setBrightness } from "./utils/platform";
import { showBrightnessFeedback } from "./utils/feedback";

export default async function Command() {
  const { closeRaycast = true, showDisplayName = true } = getPreferenceValues<Preferences.MaxBrightness>();
  try {
    const result = await setBrightness(100);
    if (!result) return;

    const message =
      showDisplayName && result.displayName && result.brightness != null
        ? `🚀 ${result.displayName}: ${result.brightness}%`
        : "🚀 Brightness to the maximum!";
    await showBrightnessFeedback(message, closeRaycast);
  } catch (error) {
    console.error("Failed to set max brightness:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Set Brightness",
      message: error instanceof Error ? error.message : "An error occurred",
    });
  }
}
