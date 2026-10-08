import { Clipboard, showToast, Toast, closeMainWindow, showHUD } from "@raycast/api";
import { addItemFromURL, addItemFromPath } from "./utils/api";
import { checkEagleInstallation } from "./utils/checkInstall";
import { showEagleNotOpenToast } from "./utils/error";

export default async function AddFromClipboard() {
  checkEagleInstallation();

  try {
    const clipboardContent = await Clipboard.readText();

    if (!clipboardContent) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard is empty",
        message: "Copy a URL or file path first",
      });
      return;
    }

    // Check if it's a URL
    const isURL = /^https?:\/\//i.test(clipboardContent.trim());

    // Check if it's a file path
    const isFilePath = /^[/~]/.test(clipboardContent.trim()) || /^[A-Za-z]:\\/.test(clipboardContent.trim());

    if (isURL) {
      await showHUD("Adding from URL...");

      await addItemFromURL({ url: clipboardContent.trim() });

      await showHUD("✓ Item added from URL");
      await closeMainWindow();
    } else if (isFilePath) {
      await showHUD("Adding from file path...");

      await addItemFromPath({ path: clipboardContent.trim() });

      await showHUD("✓ Item added from file");
      await closeMainWindow();
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid clipboard content",
        message: "Clipboard must contain a URL or file path",
      });
    }
  } catch (error) {
    const err = error as { code?: string };
    if (err?.code === "ECONNREFUSED") {
      showEagleNotOpenToast();
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add item",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
