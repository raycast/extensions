import { environment } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { writeFile } from "fs/promises";
import { join } from "path";

export async function downloadImage(
  url: string,
  destPath: string,
): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  await writeFile(destPath, Buffer.from(buffer));
}

export async function setDesktopWallpaper(
  imagePath: string,
  allDesktops: boolean = true,
): Promise<void> {
  const escapedImagePath = imagePath
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');

  if (allDesktops) {
    await runAppleScript(`
      tell application "System Events"
        tell every desktop
          set picture to "${escapedImagePath}"
        end tell
      end tell
    `);
  } else {
    await runAppleScript(`
      tell application "System Events"
        set picture of current desktop to "${escapedImagePath}"
      end tell
    `);
  }
}

export function getTempFilePath(filename: string): string {
  return join(environment.supportPath, filename);
}

export function getFileExtension(url: string): string {
  const match = url.match(/\.(\w+)(?:\?|$)/);
  return match ? match[1] : "jpg";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function purityColor(purity: string): string {
  switch (purity) {
    case "sfw":
      return "#4CAF50";
    case "sketchy":
      return "#FF9800";
    case "nsfw":
      return "#F44336";
    default:
      return "#999999";
  }
}
