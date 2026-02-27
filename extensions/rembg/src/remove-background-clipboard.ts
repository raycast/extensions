import {
  showHUD,
  showToast,
  Toast,
  getPreferenceValues,
  Clipboard,
  environment,
  showInFinder,
} from "@raycast/api";
import { ensureRembg, removeBackground, ProcessingMode } from "./utils";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

interface Preferences {
  outputSuffix: string;
  copyToClipboard: boolean;
  processingMode: ProcessingMode;
}

export default async function Command() {
  const prefs = getPreferenceValues<Preferences>();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Reading clipboard...",
  });

  // 1. Ensure rembg is installed
  let pythonPath: string;
  try {
    pythonPath = await ensureRembg();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Setup failed";
    toast.message = String(error);
    return;
  }

  // 2. Get image from clipboard using AppleScript
  const tempDir = path.join(environment.supportPath, "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const clipboardImagePath = path.join(tempDir, "clipboard_input.png");
  const outputPath = path.join(tempDir, "clipboard_nobg.png");

  try {
    const script = `
      set theFile to POSIX file "${clipboardImagePath}"
      try
        set imageData to the clipboard as «class PNGf»
        set fp to open for access theFile with write permission
        write imageData to fp
        close access fp
        return "ok"
      on error
        try
          set imageData to the clipboard as TIFF picture
          set fp to open for access theFile with write permission
          write imageData to fp
          close access fp
          return "ok"
        on error errMsg
          return "error: " & errMsg
        end try
      end try
    `;

    const result = execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
      timeout: 10000,
    })
      .toString()
      .trim();

    if (result.startsWith("error:") || !fs.existsSync(clipboardImagePath)) {
      toast.style = Toast.Style.Failure;
      toast.title = "No image in clipboard";
      toast.message = "Copy an image to your clipboard first";
      return;
    }
  } catch {
    toast.style = Toast.Style.Failure;
    toast.title = "No image in clipboard";
    toast.message = "Copy an image to your clipboard first";
    return;
  }

  // 3. Remove background
  toast.title = "Removing background...";
  toast.message = `Processing clipboard image (${prefs.processingMode})`;

  try {
    await removeBackground(
      clipboardImagePath,
      outputPath,
      pythonPath,
      prefs.processingMode,
    );

    // Copy result to clipboard
    await Clipboard.copy({ file: outputPath });

    // Save a copy to Desktop
    const desktopPath = path.join(
      process.env.HOME || "~",
      "Desktop",
      `clipboard${prefs.outputSuffix}.png`,
    );
    fs.copyFileSync(outputPath, desktopPath);
    await showInFinder(desktopPath);

    toast.style = Toast.Style.Success;
    toast.title = "Background removed!";
    toast.message = "Result copied to clipboard & saved to Desktop";

    await showHUD("Background removed — copied to clipboard");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to remove background";
    toast.message = String(error);
  } finally {
    try {
      if (fs.existsSync(clipboardImagePath)) fs.unlinkSync(clipboardImagePath);
    } catch {
      // ignore
    }
  }
}
