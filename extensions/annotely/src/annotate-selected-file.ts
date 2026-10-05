import { showToast, Toast, getSelectedFinderItems } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { serveImageAndOpenAnnotely } from "./utils";
import fs from "fs";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Getting selected file...",
  });

  try {
    let imagePath = "";

    try {
      const items = await getSelectedFinderItems();
      if (items.length > 0) {
        imagePath = items[0].path;
      }
    } catch {
      if (process.platform === "darwin") {
        // We use AppleScript as a fallback because getSelectedFinderItems throws if Finder isn't frontmost
        imagePath = await runAppleScript(`
        tell application "Finder"
          set theSelection to selection
          if theSelection is {} then
            return ""
          end if
          set theItem to item 1 of theSelection
          return POSIX path of (theItem as alias)
        end tell
      `);
      }
    }

    if (!imagePath || imagePath.trim() === "") {
      const fileManager = process.platform === "darwin" ? "Finder" : "File Explorer";
      toast.style = Toast.Style.Failure;
      toast.title = "No file selected";
      toast.message = `Please select an image file in ${fileManager}.`;
      return;
    }

    if (!fs.existsSync(imagePath)) {
      toast.style = Toast.Style.Failure;
      toast.title = "File not found";
      toast.message = "The selected file could not be found.";
      return;
    }

    if (!imagePath.match(/\.(png|jpg|jpeg|gif|webp|bmp|tiff)$/i)) {
      toast.style = Toast.Style.Failure;
      toast.title = "Invalid file type";
      toast.message = "Please select a valid image file.";
      return;
    }

    await serveImageAndOpenAnnotely(imagePath, false, toast);
  } catch (error) {
    await showFailureToast(error, { title: "Error" });
  }
}
