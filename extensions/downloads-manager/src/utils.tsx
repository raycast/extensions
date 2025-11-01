import { Action, ActionPanel, confirmAlert, Detail, getPreferenceValues, showToast, Toast, trash } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { accessSync, constants, readdirSync, statSync } from "fs";
import { rm } from "fs/promises";
import { join } from "path";
import { ComponentType } from "react";
import untildify from "untildify";

const preferences = getPreferenceValues();
export const downloadsFolder = untildify(preferences.downloadsFolder ?? "~/Downloads");
const showHiddenFiles = preferences.showHiddenFiles;
const fileOrder = preferences.fileOrder;
const lastestDownloadOrder = preferences.lastestDownloadOrder;

export function getDownloads() {
  const files = readdirSync(downloadsFolder);
  return files
    .filter((file) => showHiddenFiles || !file.startsWith("."))
    .map((file) => {
      const path = join(downloadsFolder, file);
      const stats = statSync(path);
      return {
        file,
        path,
        lastModifiedAt: stats.mtime,
        createdAt: stats.ctime,
        addedAt: stats.atime,
        birthAt: stats.birthtime,
      };
    })
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

  if (lastestDownloadOrder === "addTime") {
    downloads.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
  } else if (lastestDownloadOrder === "createTime") {
    downloads.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } else if (lastestDownloadOrder === "modifiedTime") {
    downloads.sort((a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime());
  } else if (lastestDownloadOrder === "birthTime") {
    downloads.sort((a, b) => b.birthAt.getTime() - a.birthAt.getTime());
  }

  return downloads[0];
}

export function hasAccessToDownloadsFolder() {
  try {
    accessSync(preferences.downloadsFolder, constants.R_OK);
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
    rm(filePath, { recursive: true, force: true });
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
      accessSync(preferences.downloadsFolder, constants.R_OK);
      return <Component {...props} />;
    } else {
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
    }
  };
};
