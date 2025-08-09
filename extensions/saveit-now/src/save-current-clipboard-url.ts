import { showHUD, Clipboard, showToast, Toast } from "@raycast/api";
import { createBookmark, isValidUrl } from "./api";

export default async function main() {
  try {
    const clipboardText = await Clipboard.readText();

    if (!clipboardText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No URL in Clipboard",
        message: "Please copy a URL first",
      });
      return;
    }

    const url = clipboardText.trim();

    if (!isValidUrl(url)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid URL",
        message: "Clipboard doesn't contain a valid URL",
      });
      return;
    }

    const bookmark = await createBookmark(url);

    if (bookmark) {
      await showHUD(`✅ Saved: ${bookmark.title || url}`);
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Save",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
