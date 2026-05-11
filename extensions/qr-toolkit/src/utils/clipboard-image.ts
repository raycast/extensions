import { Clipboard } from "@raycast/api";
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/**
 * Returns a local file path containing clipboard image data, or null if
 * the clipboard has no image.
 *
 * Handles two cases:
 * 1. A file (e.g. image file copied in Finder) — returned directly.
 * 2. Raw image pixel data (screenshots, "Copy Image" from browser) —
 *    extracted via AppleScript and written to a temp PNG.
 */
const tmpFiles: string[] = [];

/** Remove all temp files created by this module. */
export function cleanupClipboardTempFiles(): void {
  for (const f of tmpFiles) {
    try {
      fs.unlinkSync(f);
    } catch {
      // already removed
    }
  }
  tmpFiles.length = 0;
}

export async function getClipboardImagePath(): Promise<string | null> {
  // Case 1: clipboard holds a file reference
  try {
    const clip = await Clipboard.read();
    if (clip.file) {
      const filePath = decodeURIComponent(clip.file.replace(/^file:\/\//, ""));
      if (/\.(png|jpe?g|gif|bmp|webp|tiff?)$/i.test(filePath) && fs.existsSync(filePath)) {
        return filePath;
      }
    }
  } catch {
    // ignore
  }

  // Case 2: raw PNG data in clipboard (screenshots, browser "Copy Image")
  const tmpImg = path.join(os.tmpdir(), `qr-clipboard-${Date.now()}.png`);
  const script = [
    `set filePath to "${tmpImg}"`,
    `try`,
    `  set imgData to (the clipboard as «class PNGf»)`,
    `  set fd to open for access POSIX file filePath with write permission`,
    `  set eof fd to 0`,
    `  write imgData to fd`,
    `  close access fd`,
    `  return "ok"`,
    `on error`,
    `  return "fail"`,
    `end try`,
  ].join("\n");

  const scriptFile = path.join(os.tmpdir(), `qr-clip-${Date.now()}.scpt`);
  try {
    fs.writeFileSync(scriptFile, script);
    const result = execFileSync("osascript", [scriptFile], { encoding: "utf8" }).trim();
    if (result === "ok" && fs.existsSync(tmpImg)) {
      tmpFiles.push(tmpImg);
      return tmpImg;
    }
  } catch {
    // clipboard has no image data
  } finally {
    try {
      fs.unlinkSync(scriptFile);
    } catch {
      // ignore cleanup error
    }
  }

  return null;
}
