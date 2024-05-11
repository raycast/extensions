import { generateDescription } from "@utils/generateDescription";
import { showError } from "@utils/showError";
import { showSuccess } from "@utils/showSuccess";
import { showToast, Toast, closeMainWindow, Clipboard } from "@raycast/api";

export default async function generateFromClipboardCMD() {
  await closeMainWindow();
  await showToast({
    style: Toast.Style.Animated,
    title: "Generating alt text for this image...",
  });
  const clipboardItem = await Clipboard.read();

  if (!clipboardItem.file) {
    await showError("No image found in clipboard", { title: "No image found" });
    return;
  }

  const imageUrl = decodeURIComponent(clipboardItem.file.replace("file:///", "/"));

  try {
    const imageDescription = await generateDescription({ isLocalImagePath: true, path: imageUrl! });

    if (!imageDescription) {
      throw new Error("No description generated");
    }

    await Clipboard.copy(imageDescription);
    await showSuccess(`📋 Alt-text copied to clipboard: ${imageDescription}`);
  } catch (error) {
    await showError(error, { title: "Failed to generate alt text" });
  }
}
