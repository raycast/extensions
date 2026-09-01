import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { captureFullScreen, cleanupFile } from "./services/capture";
import { uploadImage } from "./services/upload";
import { openVisualSearch } from "./services/engines";

export default async function Command() {
  await closeMainWindow();
  await new Promise((resolve) => setTimeout(resolve, 200));

  let capturedPath: string | null = null;
  try {
    capturedPath = await captureFullScreen();

    if (!capturedPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Capture Failed",
        message: "Unable to capture the screen.",
      });
      return;
    }

    await showHUD("🔍 Searching screen...");

    const imageUrl = await uploadImage(capturedPath);
    const engineName = await openVisualSearch(imageUrl);
    await showHUD(`✨ Opened in ${engineName}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to search screen";
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
