import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fs from "fs";
import os from "os";
import path from "path";
import bplist from "bplist-parser";
import Bookmark from "./dtos/bookmark-dto";
import GitfoxRepositories, { GitfoxRepository } from "./interfaces/imported-gitfox-bookmark";
import GitfoxPreferences from "./interfaces/gitfox-preferences";

const plistLocations = [
  `${os.homedir()}/Library/Preferences/com.bytieful.Gitfox.plist`,
  `${os.homedir()}/Library/Preferences/com.bytieful.Gitfox-setapp.plist`,
  `${os.homedir()}/Library/Preferences/com.bytieful.Gitfox-retail.plist`,
]
  .filter((file) => fs.existsSync(file))
  .map((file) => ({ file, mtime: fs.lstatSync(file).mtime }))
  .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
  .map((element) => element.file);

export function isGitfoxCliInstalled(): boolean {
  try {
    const prefs = getPreferenceValues<GitfoxPreferences>();
    if (fs.existsSync(prefs.gitfoxCliPath)) return true;

    return false;
  } catch (e) {
    return false;
  }
}

export function gitfoxCliRequiredMessage(): string {
  return `
  # Missing or broken Gitfox CLI integration


  Ensure that CLI integration is enabled in the Gitfox app:

  > Settings > Intergration > Command Line Utility

  Then check if the path is the same as the one configured in the extension settings.
  `;
}

function extractBookmarks(obj: GitfoxRepository[], parents?: string): Bookmark[] {
  const bookmarks: Bookmark[] = [];

  if (!obj || obj.length === 0) {
    return bookmarks;
  }

  obj.forEach((bookmark: GitfoxRepository) => {
    const name = parents ? `${parents} / ${bookmark.title}` : bookmark.title;

    if (bookmark.children && bookmark.children.length > 0) {
      const childBookmarks = extractBookmarks(bookmark.children, name);

      childBookmarks.forEach((bookmark) => bookmarks.push(bookmark));
    }

    const item = new Bookmark(bookmark.url?.relative, name, bookmark.uniqueIdentifier);

    if (fs.existsSync(item.getPath)) {
      bookmarks.push(item);
    }
  });

  return bookmarks;
}

export async function fetchBookmarks(): Promise<Bookmark[]> {
  try {
    if (plistLocations.length === 0) {
      throw new Error();
    }

    const preferencesPlist = plistLocations[0];
    const obj = (await bplist.parseFile(fs.readFileSync(preferencesPlist)))[0];
    const repos = (
      await bplist.parseFile(obj.repositoryManagerRepositoriesRootNode)
    )[0] as unknown as GitfoxRepositories;

    if (repos.children && repos.children.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Bookmarks found",
        message: "Now is the time to start bookmarking!",
      });

      return Promise.resolve([]);
    }

    const bookmarks = extractBookmarks(repos.children);

    return Promise.resolve(bookmarks);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Something went wrong",
      message: "Could not load the Gitfox bookmarks.",
    });
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
