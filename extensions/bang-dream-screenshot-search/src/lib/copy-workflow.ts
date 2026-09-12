import type { Screenshot } from "../types";

export type CopyScreenshotInput = {
  screenshot: Screenshot;
  download: (url: string) => Promise<string>;
  copyFile: (path: string) => Promise<void>;
  removeStaleFiles: (currentPath: string) => Promise<void>;
};

export type CopyScreenshotResult = "copied" | "busy";

let copyInProgress = false;

export async function copyScreenshotFile({
  screenshot,
  download,
  copyFile,
  removeStaleFiles,
}: CopyScreenshotInput): Promise<CopyScreenshotResult> {
  if (copyInProgress) return "busy";
  copyInProgress = true;

  try {
    const path = await download(screenshot.copyUrl);
    await copyFile(path);
    await removeStaleFiles(path).catch(() => undefined);
    return "copied";
  } finally {
    copyInProgress = false;
  }
}
