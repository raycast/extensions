import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { join } from "node:path";

export class ScreenshotCancelledError extends Error {
  constructor() {
    super("Screenshot cancelled by user");
    this.name = "ScreenshotCancelledError";
  }
}

export async function takeScreenshot(): Promise<string> {
  const filePath = join(environment.supportPath, `ocr-${Date.now()}.png`);

  return new Promise((resolve, reject) => {
    execFile("/usr/sbin/screencapture", ["-i", filePath], async (error) => {
      if (error) {
        reject(new ScreenshotCancelledError());
        return;
      }
      try {
        const fileStats = await stat(filePath);
        if (fileStats.size === 0) {
          reject(new ScreenshotCancelledError());
          return;
        }
        resolve(filePath);
      } catch {
        reject(new ScreenshotCancelledError());
      }
    });
  });
}
