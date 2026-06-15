import { showHUD, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "./ntfctl-utils";

export default async function Command() {
  try {
    runAppleScript("ntfctl-center.applescript");
    await showHUD("🔔 Notification Center toggled");
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to toggle Notification Center",
      message: String(e),
    });
  }
}
