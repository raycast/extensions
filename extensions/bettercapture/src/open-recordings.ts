import { showToast, showHUD, Toast } from "@raycast/api";
import { BetterCaptureError, openRecordings } from "./lib/bettercapture";

export default async function main() {
  try {
    await openRecordings();
    await showHUD("Opened recordings folder");
  } catch (error) {
    const message =
      error instanceof BetterCaptureError
        ? error.message
        : "Failed to open recordings folder";
    await showToast({
      message: message,
      title: "BetterCapture",
      style: Toast.Style.Failure,
    });
  }
}
