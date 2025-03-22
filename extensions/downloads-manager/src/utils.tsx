import { Action, ActionPanel, Detail, getPreferenceValues } from "@raycast/api";
import { accessSync, constants, readdirSync, statSync } from "fs";
import { join } from "path";
import { ComponentType } from "react";
import untildify from "untildify";

const preferences = getPreferenceValues();
export const downloadsFolder = untildify(preferences.downloadsFolder ?? "~/Downloads");
const showHiddenFiles = preferences.showHiddenFiles;
const fileOrder = preferences.fileOrder;

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
