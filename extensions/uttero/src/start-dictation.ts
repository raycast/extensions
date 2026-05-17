import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { sendUtteroCommand, isUtteroRunning } from "./utils/command";

export default async function main() {
  if (!isUtteroRunning()) {
    await showToast({ style: Toast.Style.Failure, title: "Uttero is not running", message: "Start Uttero first." });
    return;
  }
  try {
    sendUtteroCommand("dictate");
    await closeMainWindow();
    await showHUD("Dictation started");
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Failed to start dictation", message: "Check Uttero is running." });
  }
}
