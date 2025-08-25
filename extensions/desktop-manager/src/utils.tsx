import { Action, ActionPanel, confirmAlert, Detail, getPreferenceValues, showToast, Toast, trash } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { accessSync, constants, readdirSync, statSync } from "fs";
import { rm } from "fs/promises";
import { join } from "path";
import { ComponentType } from "react";
import untildify from "untildify";

const preferences = getPreferenceValues();
export const desktopFolder = untildify(preferences.desktopFolder ?? "~/Desktop");
const showHiddenFiles = preferences.showHiddenFiles;
const fileOrder = preferences.fileOrder;
const latestDesktopOrder = preferences.latestDesktopOrder;

export function getDesktopFiles() {
  const files = readdirSync(desktopFolder);
  return files
    .filter((file) => showHiddenFiles || !file.startsWith("."))
    .map((file) => {
      const path = join(desktopFolder, file);
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

export function getLatestDesktopFile() {
  const desktopFiles = getDesktopFiles();
  if (desktopFiles.length < 1) {
    return undefined;
  }

  if (latestDesktopOrder === "addTime") {
    desktopFiles.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
  } else if (latestDesktopOrder === "createTime") {
    desktopFiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } else if (latestDesktopOrder === "modifiedTime") {
    desktopFiles.sort((a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime());
  } else if (latestDesktopOrder === "birthTime") {
    desktopFiles.sort((a, b) => b.birthAt.getTime() - a.birthAt.getTime());
  }

  return desktopFiles[0];
}

export function hasAccessToDesktopFolder() {
  try {
    accessSync(preferences.desktopFolder, constants.R_OK);
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

export const withAccessToDesktopFolder = <P extends object>(Component: ComponentType<P>) => {
  return (props: P) => {
    if (hasAccessToDesktopFolder()) {
      return <Component {...props} />;
    } else {
      const markdown = `## Permission Required\n\nThe Desktop Manager extension requires access to your Desktop folder. Please grant permission to use it.\n\n![Grant Permission](permission.png)`;
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
