import type { Screenshot } from "../types";
import { addRecentId } from "./collection-logic";

export type CopyScreenshotInput = {
  screenshot: Screenshot;
  recentIds: string[];
  download: (url: string) => Promise<string>;
  clearClipboard: () => Promise<void>;
  copyFile: (path: string) => Promise<void>;
  removeStaleFiles: (currentPath: string) => Promise<void>;
};

export async function copyScreenshotFile({
  screenshot,
  recentIds,
  download,
  clearClipboard,
  copyFile,
  removeStaleFiles,
}: CopyScreenshotInput): Promise<string[]> {
  const path = await download(screenshot.copyUrl);
  await clearClipboard();
  await copyFile(path);
  await removeStaleFiles(path).catch(() => undefined);
  return addRecentId(recentIds, screenshot.id);
}
