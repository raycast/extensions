import { showHUD, showToast, Toast } from "@raycast/api";
import { BetterCaptureError, toggleRecording } from "./lib/bettercapture";

export default async function main() {
  try {
    await toggleRecording();
    await showHUD("Sent to BetterCapture");
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
