import {
  closeMainWindow,
  showToast,
  Toast,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { captureFullScreen } from "./lib/screenshot";

export default async function Command() {
  await closeMainWindow();
  // Small delay so Raycast window fully hides before capture
  await new Promise((resolve) => setTimeout(resolve, 300));

  try {
    const imagePath = captureFullScreen();
    await launchCommand({
      name: "chat",
      type: LaunchType.UserInitiated,
      context: { pendingImage: imagePath },
    });
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Screenshot Failed",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
