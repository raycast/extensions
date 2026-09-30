import { generateDescription } from "@utils/generateDescription";
import { showSuccess } from "@utils/showSuccess";
import { showToast, Toast, closeMainWindow, Clipboard } from "@raycast/api";
import { handleError } from "@utils/handleError";
import { checkForValidFileType } from "@utils/checkForValidFileType";

export default async function generateFromClipboardCMD() {
  try {
    await closeMainWindow();
    await showToast({
      style: Toast.Style.Animated,
      title: "Generating alt text for this image...",
    });
    const clipboardItem = await Clipboard.read();
    console.log("Clipboard item: ", clipboardItem);

    if (!clipboardItem.file) {
      throw new Error("No image found in clipboard");
    }

    const { isValid, fileType } = checkForValidFileType(clipboardItem.file);

    if (!isValid) {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    const imageUrl = decodeURIComponent(clipboardItem.file.replace("file:///", "/"));
    console.log("Image URL: ", imageUrl);
    const imageDescription = await generateDescription({ isLocalImagePath: true, path: imageUrl! });

    await Clipboard.copy(imageDescription);
    await showSuccess(`Alt-text copied to clipboard: ${imageDescription}`);
  } catch (error) {
    handleError(error);
  }
}
