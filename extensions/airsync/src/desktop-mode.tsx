import { showToast, Toast, closeMainWindow, showHUD } from "@raycast/api";
import { launchDesktopMode } from "./utils/applescript";

export default async function Command() {
  try {
    await closeMainWindow();

    const response = await launchDesktopMode();

    if (response.success) {
      await showHUD(`🖥️ ${response.message}`);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to launch desktop mode",
        message: response.message,
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to launch desktop mode",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
