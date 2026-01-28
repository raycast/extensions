import {
  Action,
  ActionPanel,
  Cache,
  confirmAlert,
  Detail,
  getPreferenceValues,
  showToast,
  Toast,
  trash,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { accessSync, constants, readdirSync, statSync } from "fs";
import { rm } from "fs/promises";
import { join } from "path";
import { execSync } from "child_process";
import { homedir } from "os";
import { ComponentType } from "react";
import untildify from "untildify";

const cache = new Cache();
const CACHE_KEY = "customDownloadsFolder";

const preferences = getPreferenceValues();

function getCachedOrDetectDownloadsFolder(): string {
  // If preference is set, use it
  if (preferences.downloadsFolder && preferences.downloadsFolder.trim()) {
    return untildify(preferences.downloadsFolder);
  }

  // Check cache first
  const cached = cache.get(CACHE_KEY);
  if (cached && typeof cached === "string") {
    return cached;
  }

  // Detect and cache the folder
  const detected = getCustomDownloadsFolder();
  cache.set(CACHE_KEY, detected);
  return detected;
}

export const downloadsFolder = getCachedOrDetectDownloadsFolder();
const showHiddenFiles = preferences.showHiddenFiles;
const fileOrder = preferences.fileOrder;
const latestDownloadOrder = preferences.lastestDownloadOrder;
export const defaultDownloadsLayout = preferences.downloadsLayout ?? "list";
const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tiff", ".heic", ".svg"];

export function getCustomDownloadsFolder(): string {
  // macOS
  if (process.platform === "darwin") {
    return untildify("~/Downloads");
  } else if (process.platform === "win32") {
    // Query Windows registry for the actual Downloads folder location
    try {
      const result = execSync(
        `powershell -Command "(New-Object -ComObject Shell.Application).NameSpace('shell:Downloads').Self.Path"`,
        { encoding: "utf-8" },
      );
      return result.trim();
    } catch (error) {
      // Fallback to default location if registry query fails
      console.error("Failed to get Downloads folder from registry:", error);
      return join(homedir(), "Downloads");
    }
  }
  // Fallback for other platforms
  return untildify("~/Downloads");
}

export function isImageFile(filename: string): boolean {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) return false;
  const ext = filename.toLowerCase().slice(dotIndex);
  return imageExtensions.includes(ext);
}

export function getDownloads() {
  const files = readdirSync(downloadsFolder);
  return files
    .filter((file) => showHiddenFiles || !file.startsWith("."))
    .map((file) => {
      const path = join(downloadsFolder, file);
      try {
        const stats = statSync(path);
        return {
          file,
          path,
          lastModifiedAt: stats.mtime,
          createdAt: stats.ctime,
          addedAt: stats.atime,
          birthAt: stats.birthtime,
        };
      } catch (error) {
        // Skip entries we can't stat (broken symlinks, removed targets, permission issues)
        console.warn(`Skipping '${path}' because it could not be stat'd:`, error);
        return undefined;
      }
    })
    .filter((entry) => Boolean(entry))
    .map((entry) => entry as Exclude<typeof entry, undefined>)
    .sort((a, b) => {
      switch (fileOrder) {
        case "addTime":
          return b.addedAt.getTime() - a.addedAt.getTime();
        case "createTime":
          return b.createdAt.getTime() - a.createdAt.getTime();
        case "modifiedTime":
        default:
          return b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime();
      }
    });
}

export function getLatestDownload() {
  const downloads = getDownloads();
  if (downloads.length < 1) {
    return undefined;
  }

  if (latestDownloadOrder === "addTime") {
    downloads.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
  } else if (latestDownloadOrder === "createTime") {
    downloads.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } else if (latestDownloadOrder === "modifiedTime") {
    downloads.sort((a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime());
  } else if (latestDownloadOrder === "birthTime") {
    downloads.sort((a, b) => b.birthAt.getTime() - a.birthAt.getTime());
  }

  return downloads[0];
}

export function hasAccessToDownloadsFolder() {
  try {
    accessSync(downloadsFolder, constants.R_OK);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function deleteFileOrFolder(filePath: string) {
  if (preferences.deletionBehavior === "trash") {
    try {
      await trash(filePath);
      await showToast({ style: Toast.Style.Success, title: "Item Moved to Trash" });
    } catch (error) {
      await showFailureToast(error, { title: "Move to Trash Failed" });
    }
    return;
  }

  const shouldDelete = await confirmAlert({
    title: "Delete Item?",
    message: `Are you sure you want to permanently delete:\n${filePath}?`,
    primaryAction: {
      title: "Delete",
    },
  });

  if (!shouldDelete) {
    await showToast({ style: Toast.Style.Animated, title: "Cancelled" });
    return;
  }

  try {
    await rm(filePath, { recursive: true, force: true });
    await showToast({ style: Toast.Style.Success, title: "Item Deleted" });
  } catch (error) {
    if (error instanceof Error) {
      await showFailureToast(error, { title: "Deletion Failed" });
    }
  }
}

export const withAccessToDownloadsFolder = <P extends object>(Component: ComponentType<P>) => {
  return (props: P) => {
    if (hasAccessToDownloadsFolder()) {
      return <Component {...props} />;
    } else {
      if (process.platform === "darwin") {
        const markdown = `## Permission Required\n\nThe Downloads Manager extension requires access to your Downloads folder. Please grant permission to use it.\n\n![Grant Permission](permission.png)`;
        return (
          <Detail
            markdown={markdown}
            actions={
              <ActionPanel>
                <Action.Open
                  title="Grant Permission"
                  target="x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"
                />
              </ActionPanel>
            }
          />
        );
      } else {
        // Windows: Usually a path issue, not a permission issue
        const markdown = `## Cannot Access Downloads Folder\n\nUnable to access the Downloads folder at:\n\`${downloadsFolder}\`\n\nPlease check that the folder exists and the path is correct.`;
        return (
          <Detail
            markdown={markdown}
            actions={
              <ActionPanel>
                <Action.ShowInFinder path={downloadsFolder} />
              </ActionPanel>
            }
          />
        );
      }
    }
  };
};
