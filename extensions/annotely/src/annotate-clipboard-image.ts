import { Clipboard, showToast, Toast } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { serveImageAndOpenAnnotely } from "./utils";

const execAsync = promisify(exec);

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
        if (process.platform === "darwin") {
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
        } else if (process.platform === "win32") {
          const psCommand = `
            Add-Type -AssemblyName System.Windows.Forms;
            if ([System.Windows.Forms.Clipboard]::ContainsImage()) {
              $image = [System.Windows.Forms.Clipboard]::GetImage();
              $image.Save('${tempFile.replace(/\\/g, "\\\\")}', [System.Drawing.Imaging.ImageFormat]::Png);
            }
          `;
          await execAsync(`powershell -Command "${psCommand.replace(/"/g, '\\"')}"`);
        }

        if (fs.existsSync(tempFile)) {
          imagePath = tempFile;
          isTempFile = true;
        }
      } catch {
        // Ignore errors (likely no image in clipboard)
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
    await showFailureToast(error, { title: "Error" });
  }
}
