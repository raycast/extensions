import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { addBookmark, isValidUrl } from "./lib/api";

export default async function Command() {
  const clipboardText = await Clipboard.readText();

  if (!clipboardText) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Clipboard is empty",
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

  try {
    await addBookmark(url);
    await showHUD("Bookmark saved!");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to save bookmark",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
