import { environment, Clipboard } from "@raycast/api";
import { execFileSync, execFile } from "child_process";
import { readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const SCREENCAPTURE = "/usr/sbin/screencapture";
const IMAGE_DIR = join(environment.supportPath, "images");

function ensureImageDir() {
  if (!existsSync(IMAGE_DIR)) {
    mkdirSync(IMAGE_DIR, { recursive: true });
  }
}

function generateImagePath(): string {
  ensureImageDir();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return join(IMAGE_DIR, `img-${id}.png`);
}

const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".tiff", ".bmp"];

/** Capture the full screen. Returns file path. */
export function captureFullScreen(): string {
  const imagePath = generateImagePath();
  try {
    execFileSync(SCREENCAPTURE, ["-x", imagePath]);
  } catch (err: unknown) {
    const detail =
      err instanceof Error ? err.message : "check Screen Recording permission";
    throw new Error(`screencapture failed: ${detail}`);
  }
  if (!existsSync(imagePath)) {
    throw new Error(
      "No screenshot created — grant Raycast Screen Recording permission in System Settings > Privacy",
    );
  }
  return imagePath;
}

/** Capture a user-selected screen area (crosshair). Returns file path. */
export function captureScreenArea(): Promise<string> {
  return new Promise((resolve, reject) => {
    const imagePath = generateImagePath();
    execFile(SCREENCAPTURE, ["-i", "-x", imagePath], (error) => {
      if (error || !existsSync(imagePath)) {
        reject(new Error("Screenshot cancelled"));
        return;
      }
      resolve(imagePath);
    });
  });
}

/**
 * Read image from clipboard. Tries Raycast Clipboard API first (for copied files),
 * then falls back to AppleScript for raw image data (e.g. from Cmd+Shift+4).
 */
export async function readClipboardImage(): Promise<string | null> {
  // Approach 1: Raycast Clipboard.read() — works for copied image files
  try {
    const content = await Clipboard.read();
    if (content.file) {
      let filePath = decodeURIComponent(content.file);
      if (filePath.startsWith("file://")) {
        filePath = filePath.slice(7);
      }
      const lower = filePath.toLowerCase();
      if (
        IMAGE_EXTS.some((ext) => lower.endsWith(ext)) &&
        existsSync(filePath)
      ) {
        return filePath;
      }
    }
  } catch (err) {
    console.warn(
      "[screenshot] Clipboard.read() failed, trying AppleScript:",
      err,
    );
  }

  // Approach 2: AppleScript — extracts raw PNG data from clipboard
  const imagePath = generateImagePath();
  return new Promise((resolve) => {
    execFile(
      "/usr/bin/osascript",
      [
        "-e",
        "try",
        "-e",
        "set imgData to the clipboard as \u00ABclass PNGf\u00BB",
        "-e",
        `set filePath to POSIX file "${imagePath.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
        "-e",
        "set fileRef to open for access filePath with write permission",
        "-e",
        "set eof fileRef to 0",
        "-e",
        "write imgData to fileRef",
        "-e",
        "close access fileRef",
        "-e",
        'return "ok"',
        "-e",
        "on error errMsg",
        "-e",
        'return "no_image"',
        "-e",
        "end try",
      ],
      (error, stdout) => {
        if (error) {
          resolve(null);
          return;
        }
        const result = stdout.toString().trim();
        if (result === "ok" && existsSync(imagePath)) {
          resolve(imagePath);
        } else {
          resolve(null);
        }
      },
    );
  });
}

/** Read a PNG file and return its base64 encoding. */
export function imageToBase64(imagePath: string): string {
  return readFileSync(imagePath).toString("base64");
}
