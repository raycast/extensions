import { execSync } from "child_process";
import * as os from "os";
import * as path from "path";

function expandTilde(p: string): string {
  return p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p;
}

/**
 * Returns the directory where macOS saves screenshots.
 * Reads from com.apple.screencapture defaults, falls back to ~/Desktop.
 */
export function getScreenshotDir(): string {
  try {
    const result = execSync("defaults read com.apple.screencapture location", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (result.length > 0) {
      return expandTilde(result);
    }
  } catch {
    // key not set or defaults command failed
  }
  return path.join(os.homedir(), "Desktop");
}
