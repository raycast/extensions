import { Clipboard, environment, showHUD } from "@raycast/api";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

/**
 * Execute a command and return the output as a promise
 */
function spawnPromise(command: string, args: string[]): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const process = spawn(command, args, { shell: false });

    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    process.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    process.on("close", (code: number | null) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });

    process.on("error", reject);
  });
}

/**
 * Add a file to Dropover
 */
async function addToDropover(filePath: string): Promise<void> {
  const args = ["-b", "me.damir.dropover-mac", filePath];
  await spawnPromise("open", args);
}

// Maximum age for temporary files (24 hours in milliseconds)
const MAX_FILE_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Clean up old clipboard files from the support directory
 * Removes files older than 24 hours to prevent storage buildup
 */
function cleanupOldFiles(supportPath: string): void {
  try {
    if (!fs.existsSync(supportPath)) return;

    const now = Date.now();
    const files = fs.readdirSync(supportPath);

    for (const file of files) {
      // Only clean up clipboard-related files
      if (!file.startsWith("clipboard-")) continue;

      const filePath = path.join(supportPath, file);
      try {
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtimeMs;

        if (fileAge > MAX_FILE_AGE_MS) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // Ignore errors for individual files
      }
    }
  } catch {
    // Silently ignore cleanup errors
  }
}

// Image format definitions with clipboard class identifiers
interface ImageFormat {
  name: string;
  extension: string;
  clipboardClass: string;
  clipboardIndicator: string;
}

const IMAGE_FORMATS: ImageFormat[] = [
  // Common formats first - PNG is preferred for screenshots
  { name: "PNG", extension: ".png", clipboardClass: "«class PNGf»", clipboardIndicator: "«class PNGf»" },
  { name: "JPEG", extension: ".jpg", clipboardClass: "JPEG picture", clipboardIndicator: "JPEG picture" },

  // Modern formats
  { name: "WebP", extension: ".webp", clipboardClass: "«class WebP»", clipboardIndicator: "«class WebP»" },
  { name: "HEIC", extension: ".heic", clipboardClass: "«class heic»", clipboardIndicator: "«class heic»" },
  { name: "AVIF", extension: ".avif", clipboardClass: "«class AVIF»", clipboardIndicator: "«class AVIF»" },

  // GIF - check after common formats (macOS provides GIF conversion for most images)
  { name: "GIF", extension: ".gif", clipboardClass: "«class GIFf»", clipboardIndicator: "GIF picture" },

  // Other formats
  { name: "JPEG 2000", extension: ".jp2", clipboardClass: "«class jp2 »", clipboardIndicator: "«class jp2 »" },
  { name: "TIFF", extension: ".tiff", clipboardClass: "TIFF picture", clipboardIndicator: "TIFF picture" },
  { name: "BMP", extension: ".bmp", clipboardClass: "«class BMP »", clipboardIndicator: "«class BMP »" },
  { name: "ICO", extension: ".ico", clipboardClass: "«class icns»", clipboardIndicator: "«class icns»" },
  { name: "PSD", extension: ".psd", clipboardClass: "«class 8BPS»", clipboardIndicator: "«class 8BPS»" },
];

// Video formats to detect (not supported)
const VIDEO_INDICATORS = [
  "«class M4V »",
  "«class mp4v»",
  "«class mpg4»",
  "«class MOV »",
  "«class mov »",
  "«class AVI »",
  "«class avi »",
  "«class MKV »",
  "«class mkv »",
  "«class WebM»",
  "«class webm»",
  "Movie",
  "QuickTime",
];

/**
 * Get clipboard info to detect available formats
 */
async function getClipboardInfo(): Promise<string> {
  try {
    return await spawnPromise("osascript", ["-e", "clipboard info"]);
  } catch {
    return "";
  }
}

/**
 * Check if clipboard contains video content
 */
function hasVideoContent(clipboardInfo: string): boolean {
  return VIDEO_INDICATORS.some((indicator) => clipboardInfo.includes(indicator));
}

/**
 * Detect which image format is available in clipboard
 * Uses the ORDER from clipboard info - first format is typically the original
 */
async function detectClipboardImageFormat(info: string | null): Promise<ImageFormat | null> {
  if (!info) return null;

  // Find the first matching format based on position in clipboard info
  // The first format in the clipboard info is typically the primary/original format
  let bestFormat: ImageFormat | null = null;
  let bestPosition = Infinity;

  for (const format of IMAGE_FORMATS) {
    const position = info.indexOf(format.clipboardIndicator);
    if (position !== -1 && position < bestPosition) {
      bestPosition = position;
      bestFormat = format;
    }
  }

  return bestFormat;
}

/**
 * Save clipboard image to a file using osascript
 */
async function saveClipboardImage(outputPath: string, format: ImageFormat): Promise<string | null> {
  try {
    // Use osascript to write clipboard image data to file
    const script = `
      set thePath to POSIX file "${outputPath}"
      set imageData to the clipboard as ${format.clipboardClass}
      set fileRef to open for access thePath with write permission
      set eof of fileRef to 0
      write imageData to fileRef
      close access fileRef
      return "success"
    `;
    await spawnPromise("osascript", ["-e", script]);
    return fs.existsSync(outputPath) ? outputPath : null;
  } catch {
    // If the specific format fails, try PNG as fallback
    if (format.extension !== ".png") {
      try {
        const pngPath = outputPath.replace(format.extension, ".png");
        const pngScript = `
          set thePath to POSIX file "${pngPath}"
          set imageData to the clipboard as «class PNGf»
          set fileRef to open for access thePath with write permission
          set eof of fileRef to 0
          write imageData to fileRef
          close access fileRef
          return "success"
        `;
        await spawnPromise("osascript", ["-e", pngScript]);
        return fs.existsSync(pngPath) ? pngPath : null;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Main command: Add clipboard content to Dropover
 */
export default async function main() {
  try {
    // Ensure support directory exists
    const supportPath = environment.supportPath;
    if (!fs.existsSync(supportPath)) {
      fs.mkdirSync(supportPath, { recursive: true });
    }

    // Clean up old temporary files (older than 24 hours)
    cleanupOldFiles(supportPath);

    // Get clipboard info for format detection
    const clipboardInfo = await getClipboardInfo();

    // Check if clipboard contains video (not supported)
    if (clipboardInfo && hasVideoContent(clipboardInfo)) {
      await showHUD("🎬 Videos are not supported! Only images and text.");
      return;
    }

    // Check if clipboard has image data
    const imageFormat = await detectClipboardImageFormat(clipboardInfo);
    if (imageFormat) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const imagePath = path.join(supportPath, `clipboard-image-${timestamp}${imageFormat.extension}`);

      const saved = await saveClipboardImage(imagePath, imageFormat);
      if (saved) {
        await addToDropover(imagePath);
        await showHUD(`📎 Added ${imageFormat.name} image to Dropover`);
        return;
      } else {
        await showHUD(`❌ Failed to save ${imageFormat.name} image from clipboard`);
        return;
      }
    }

    // Fallback: Read clipboard content using Raycast API
    const clipboardContent = await Clipboard.read();

    // Check if clipboard contains a file path
    if (clipboardContent.file) {
      await addToDropover(clipboardContent.file);
      await showHUD("📎 Added file from clipboard to Dropover");
      return;
    }

    // Check if clipboard contains text
    if (clipboardContent.text) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const textFilePath = path.join(supportPath, `clipboard-text-${timestamp}.txt`);

      fs.writeFileSync(textFilePath, clipboardContent.text, "utf-8");

      await addToDropover(textFilePath);
      await showHUD("📎 Added text from clipboard to Dropover");
      return;
    }

    // No supported content in clipboard
    if (clipboardInfo) {
      await showHUD("❌ Unsupported format! Only images and text are supported.");
    } else {
      await showHUD("📋 Clipboard is empty");
    }
  } catch (error) {
    console.error(error);
    await showHUD("📛 Failed to add clipboard content to Dropover!");
  }
}
