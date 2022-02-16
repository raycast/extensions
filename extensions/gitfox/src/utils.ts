import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fs from "fs";
import os from "os";
import path from "path";
import bplist from "bplist-parser";
import Bookmark from "./dtos/bookmark-dto";
import GitfoxRepositories, { GitfoxRepository } from "./interfaces/imported-gitfox-bookmark";
import GitfoxPreferences from "./interfaces/gitfox-preferences";

const preferencesPlistLocationSetapp = `${os.homedir()}/Library/Preferences/com.bytieful.Gitfox-setapp.plist`;
const preferencesPlistLocation = `${os.homedir()}/Library/Preferences/com.bytieful.Gitfox.plist`;

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
  # Gitfox CLI integration not installed

  Please enable the Gitfox CLI integration in the GitFox app Settings > Intergration > Command Line Utility
  `;
}

async function extractBookmarks(obj: GitfoxRepository[], parents?: string): Promise<Bookmark[]> {
  const bookmarks: Bookmark[] = [];

  if (!obj || obj.length === 0) {
    return Promise.resolve(bookmarks);
  }

  obj.forEach(async (bookmark: GitfoxRepository) => {
    const name = parents ? `${parents} / ${bookmark.title}` : bookmark.title;

    if (bookmark.children && bookmark.children.length > 0) {
      const childBookmarks = await extractBookmarks(bookmark.children, name);

      childBookmarks.forEach((bookmark) => bookmarks.push(bookmark));
    }

    const item = new Bookmark(bookmark.url?.relative, name, bookmark.uniqueIdentifier);

    if (fs.existsSync(item.getPath)) {
      bookmarks.push(item);
    }
  });

  return Promise.resolve(bookmarks);
}

export async function fetchBookmarks(): Promise<Bookmark[]> {
  try {
    const preferencesPlist = fs.existsSync(preferencesPlistLocation)
      ? preferencesPlistLocation
      : preferencesPlistLocationSetapp;

    const obj = (await bplist.parseFile(fs.readFileSync(preferencesPlist)))[0];
    const repos = (
      await bplist.parseFile(obj.repositoryManagerRepositoriesRootNode)
    )[0] as unknown as GitfoxRepositories;

    if (repos.children && repos.children.length === 0) {
      await showToast(Toast.Style.Failure, "No Bookmarks found", "Now is the time to start bookmarking!");

      return Promise.resolve([]);
    }

    const bookmarks = await extractBookmarks(repos.children);

    return Promise.resolve(bookmarks);
  } catch (error) {
    await showToast(
      Toast.Style.Failure,
      "Something whent wrong",
      "Something whent wrong loading the Gitfox bookmarks."
    );
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
