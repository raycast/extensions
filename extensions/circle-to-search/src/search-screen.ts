import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { captureInteractiveArea, cleanupFile } from "./services/capture";
import { uploadImage } from "./services/upload";
import { openVisualSearch } from "./services/engines";

export default async function Command() {
  // Close the Raycast prompt window so it doesn't obstruct the screen
  await closeMainWindow();

  // Brief pause for the Raycast window to vanish from the desktop before snapshotting
  await new Promise((resolve) => setTimeout(resolve, 200));

  let capturedPath: string | null = null;
  try {
    capturedPath = await captureInteractiveArea();

    // If user cancelled (pressed Escape or released without selecting)
    if (!capturedPath) {
      return;
    }

    await showHUD("🔍 Searching...");

    const imageUrl = await uploadImage(capturedPath);
    const engineName = await openVisualSearch(imageUrl);
    await showHUD(`✨ Opened in ${engineName}`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to search image";
    await showToast({
      style: Toast.Style.Failure,
      title: "Search Failed",
      message,
    });
  } finally {
    if (capturedPath) {
      cleanupFile(capturedPath);
    }
  }
}
