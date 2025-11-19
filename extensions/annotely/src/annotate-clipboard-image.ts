import { Clipboard, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import fs from "fs";
import path from "path";
import os from "os";
import { serveImageAndOpenAnnotely } from "./utils";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Getting image from clipboard...",
  });

  try {
    let imagePath: string | undefined;
    let isTempFile = false;
    const clipboardContent = await Clipboard.read();

    if (clipboardContent.file) {
      const decodedPath = decodeURIComponent(clipboardContent.file.replace(/^file:\/\//, ""));
      if (fs.existsSync(decodedPath)) {
        imagePath = decodedPath;
      }
    }

    if (!imagePath) {
      const tempFile = path.join(os.tmpdir(), `annotely-clipboard-${Date.now()}.png`);

      try {
        await runAppleScript(`
          set theFile to (POSIX file "${tempFile}")
          try
            set theData to the clipboard as «class PNGf»
            set theRef to open for access theFile with write permission
            set eof of theRef to 0
            write theData to theRef
            close access theRef
          on error
            try
              close access theFile
            end try
            error "No image data found"
          end try
        `);

        if (fs.existsSync(tempFile)) {
          imagePath = tempFile;
          isTempFile = true;
        }
      } catch {
        // Ignore AppleScript errors (likely no image in clipboard)
      }
    }

    if (!imagePath) {
      toast.style = Toast.Style.Failure;
      toast.title = "No image found";
      toast.message = "Please copy an image or screenshot to clipboard first.";
      return;
    }

    await serveImageAndOpenAnnotely(imagePath, isTempFile, toast);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Error";
    toast.message = String(error);
  }
}
