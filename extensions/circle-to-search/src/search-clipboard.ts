import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { getClipboardImage, cleanupFile } from "./services/capture";
import { uploadImage } from "./services/upload";
import { openVisualSearch } from "./services/engines";

export default async function Command() {
  await closeMainWindow();

  let imagePath: string | null = null;
  try {
    imagePath = await getClipboardImage();

    if (!imagePath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Image Found",
        message: "Please copy an image or screenshot to your clipboard first.",
      });
      return;
    }

    await showHUD("🔍 Searching clipboard image...");

    const imageUrl = await uploadImage(imagePath);
    const engineName = await openVisualSearch(imageUrl);
    await showHUD(`✨ Opened in ${engineName}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to search clipboard image";
    await showToast({
      style: Toast.Style.Failure,
      title: "Search Failed",
      message,
    });
  } finally {
    if (imagePath) {
      cleanupFile(imagePath);
    }
  }
}
