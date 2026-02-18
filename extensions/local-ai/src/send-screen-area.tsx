import {
  closeMainWindow,
  showToast,
  Toast,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { captureScreenArea } from "./lib/screenshot";

export default async function Command() {
  await closeMainWindow();

  try {
    const imagePath = await captureScreenArea();
    await launchCommand({
      name: "chat",
      type: LaunchType.UserInitiated,
      context: { pendingImage: imagePath },
    });
  } catch (err) {
    // "Screenshot cancelled" = user pressed Escape — don't show error
    const msg = err instanceof Error ? err.message : "";
    if (!msg.includes("cancelled")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Screenshot Failed",
        message: msg,
      });
    }
  }
}
