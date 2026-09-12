import { getPreferenceValues, showToast, showHUD, Toast } from "@raycast/api";
import api from "./api.js";
import { EMOJI } from "./constants/emoji.js";

export default async function Command() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const xKey = preferences["x-key"];
  const port = preferences.port;

  try {
    // First, get the current enhanced mode status
    const currentStatusResponse = await api(xKey, port).getEnhancedMode();
    const isCurrentlyEnabled = currentStatusResponse.data.enabled;

    // Toggle the status
    const newStatus = !isCurrentlyEnabled;
    await api(xKey, port).changeEnhancedMode(newStatus);

    // Show success message
    const action = newStatus ? "Enabled" : "Disabled";
    const icon = newStatus ? EMOJI.ENABLED : EMOJI.DISABLED;
    await showHUD(`${icon} Enhanced Mode ${action}`);
  } catch (error) {
    console.log("🚀 ~ toggle-enhanced-mode.ts:23 ~ Command ~ error:", error);
    // Show error message
    await showToast(
      Toast.Style.Failure,
      "Failed to Toggle Enhanced Mode",
      "Please check your X-Key, port and function availability",
    );
  }
}
