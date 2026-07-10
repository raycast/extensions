import { showHUD, Clipboard, showToast, Toast } from "@raycast/api";
import { getActiveWindow } from "./utils/window-manager";

export default async function main() {
  try {
    const activeWindow = await getActiveWindow();
    const sizeStr = `${activeWindow.width}x${activeWindow.height}`;
    const hudStr = `Current size: ${activeWindow.width}×${activeWindow.height}`;

    await Clipboard.copy(sizeStr);
    await showHUD(hudStr);
  } catch (error: unknown) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to get active window size",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
