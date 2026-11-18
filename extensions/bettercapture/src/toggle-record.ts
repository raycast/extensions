import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { BetterCaptureError, toggleRecording } from "./lib/bettercapture";

export default async function main() {
  const { toggleAction } = getPreferenceValues<Preferences.ToggleRecord>();

  try {
    const executedAction = await toggleRecording(toggleAction);
    await showHUD(
      executedAction === "toggle-copy"
        ? "Sent to BetterCapture (copy on finish)"
        : "Sent to BetterCapture",
    );
  } catch (error) {
    const message =
      error instanceof BetterCaptureError
        ? error.message
        : "Failed to toggle recording";
    await showToast({
      message: message,
      title: "BetterCapture",
      style: Toast.Style.Failure,
    });
  }
}
