import { showToast, Toast, closeMainWindow, showHUD } from "@raycast/api";
import { launchMirroring } from "./utils/applescript";

export default async function Command() {
  try {
    await closeMainWindow();

    const response = await launchMirroring();

    if (response.success) {
      await showHUD(`🎥 ${response.message}`);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to launch mirroring",
        message:
          response.error === "adb_not_found"
            ? "ADB not found. Install via: brew install android-platform-tools"
            : response.message,
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to launch mirroring",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
