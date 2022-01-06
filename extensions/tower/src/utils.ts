import { preferences, showToast, ToastStyle } from "@raycast/api";
import fs from "fs";
import os from "os";
import path from "path";
import plist from "plist";
import Bookmark from "./dtos/bookmark-dto";
import ImportedTowerBookmarks, { ImportedTowerBookmark } from "./interfaces/imported-tower-bookmark";

const towerBookmarksPlistLocation = `${os.homedir()}/Library/Application Support/com.fournova.Tower3/bookmarks-v2.plist`;

export function isTowerCliInstalled(): boolean {
  try {
    const towerCliPath = preferences.towerCliPath.value as string;
    if (fs.existsSync(towerCliPath)) return true;

    return false;
  } catch (e) {
    return false;
  }
}

export function towerCliRequiredMessage(): string {
  return `
  # Tower CLI not installed

  Please enable the Tower Command Line Utility in the Tower app Settings > Intergration > Tower Command Line Utility
  You can find more information over [here](https://www.git-tower.com/help/guides/integration/cli-tool/mac).
      `;
}

async function extractBookmarks(obj: ImportedTowerBookmark[], parents?: string): Promise<Bookmark[]> {
  const bookmarks: Bookmark[] = [];

  if (!obj || obj.length === 0) {
    return Promise.resolve(bookmarks);
  }

  obj.forEach(async (bookmark: ImportedTowerBookmark) => {
    const name = parents ? `${parents} / ${bookmark.name}` : bookmark.name;

    if (bookmark.children && bookmark.children.length > 0) {
      const childBookmarks = await extractBookmarks(bookmark.children, name);

      childBookmarks.forEach((bookmark) => bookmarks.push(bookmark));
    }

    bookmarks.push(
      new Bookmark(bookmark.fileURL, name, bookmark.lastOpenedDate, bookmark.repositoryIdentifier, bookmark.type)
    );
  });

  return Promise.resolve(bookmarks);
}

export async function fetchBookmarks(): Promise<Bookmark[]> {
  try {
    const bookmarksFile = towerBookmarksPlistLocation;
    const obj = plist.parse(fs.readFileSync(bookmarksFile, "utf8")) as unknown as ImportedTowerBookmarks;

    if (obj.children.length === 0) {
      await showToast(ToastStyle.Failure, "No Bookmarks found", "Now is the time to start bookmarking!");

      return Promise.resolve([]);
    }

    let bookmarks = await extractBookmarks(obj.children);

    bookmarks = bookmarks
      .filter((b: Bookmark) => b.Folder !== "")
      .sort(function (a: Bookmark, b: Bookmark) {
        return ("" + b.LastOpenedDate).localeCompare("" + a.LastOpenedDate);
      });

    return Promise.resolve(bookmarks);
  } catch (error) {
    await showToast(ToastStyle.Failure, "Something whent wrong", "Something whent wrong loading the Tower bookmarks.");
    return Promise.resolve([]);
  }
}

export function getCurrentBranchName(gitRepoPath: string): string {
  const gitHeadPath = `${gitRepoPath}/.git/HEAD`;

  return fs.existsSync(gitRepoPath)
    ? fs.existsSync(gitHeadPath)
      ? fs.readFileSync(gitHeadPath, "utf-8").trim().split("/").slice(2).join("/")
      : getCurrentBranchName(path.resolve(gitRepoPath, ".."))
    : "";
}
