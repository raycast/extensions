import { showHUD, Clipboard, showToast, Toast, closeMainWindow } from "@raycast/api";
import fs from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

export default async function main() {
  const { file } = await Clipboard.read();
  const filePath = normalizeFilePath(file);
  if (filePath && (await isVideoFile(filePath))) {
    try {
      // Show a toast with progress indicator
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating GIF",
        message: "Converting video to GIF...",
      });

      const gifPath = await convertVideoToGif(filePath);

      // Update toast to success when completed
      toast.style = Toast.Style.Success;
      toast.title = "GIF Created";
      toast.message = "GIF has been pasted successfully";

      await Clipboard.paste({ file: gifPath });
      await closeMainWindow();
    } catch (error) {
      console.error("Error creating GIF:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Create GIF",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  } else {
    await showHUD("No video file found in clipboard");
  }
}

function normalizeFilePath(filePath: string | undefined): string | undefined {
  if (!filePath) return undefined;

  // Handle file:// URLs by converting to local file path
  if (filePath.startsWith("file://")) {
    // Remove file:// prefix and decode URL components
    return decodeURIComponent(filePath.substring(7));
  }
  return filePath;
}

const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
async function isVideoFile(filePath: string | undefined): Promise<boolean> {
  if (!filePath) return false;

  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) return false;

    const extension = path.extname(filePath).toLowerCase();
    return videoExtensions.includes(extension);
  } catch (error) {
    console.error("Error checking file type:", error);
    return false;
  }
}

const execPromise = promisify(exec);
async function convertVideoToGif(videoPath: string): Promise<string> {
  // Create output file path with same name but .gif extension
  const outputPath = path.join(path.dirname(videoPath), `${path.basename(videoPath, path.extname(videoPath))}.gif`);

  // Use ffmpeg to convert video to gif
  // -i: input file
  // -vf: video filter for scaling and fps
  // -y: overwrite output file if it exists
  const ffmpegCommand = `ffmpeg -i "${videoPath}" -vf "fps=10,scale=640:-1:flags=lanczos" -y "${outputPath}"`;

  try {
    await execPromise(ffmpegCommand);
    return outputPath;
  } catch (error) {
    console.error("FFmpeg conversion failed:", error);
    throw new Error("Failed to convert video to GIF");
  }
}
