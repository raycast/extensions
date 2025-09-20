import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fs from "fs";
import os from "os";
import path from "path";
import bplist from "bplist-parser";
import Bookmark from "./dtos/bookmark-dto";
import GitfoxRepositories, { GitfoxRepositoryV2, GitfoxRepositoryV3 } from "./interfaces/imported-gitfox-bookmark";
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

function extractBookmarks(isV3: boolean, obj: GitfoxRepositories | GitfoxRepositoryV3[]): Bookmark[] {
  if (isV3) {
    const repos = obj as GitfoxRepositoryV3[];
    return extractBookmarksV3(repos);
  } else {
    const repos = (obj as GitfoxRepositories).children;
    return extractBookmarksV2(repos);
  }
}

function extractBookmarksV2(
  obj: GitfoxRepositoryV2[],
  parents?: string,
  visited = new Set<GitfoxRepositoryV2>(),
): Bookmark[] {
  const bookmarks: Bookmark[] = [];

  if (!obj || obj.length === 0) {
    return bookmarks;
  }

  obj.forEach((bookmark: GitfoxRepositoryV2) => {
    if (visited.has(bookmark)) return; // Prevent cyclic references
    visited.add(bookmark);

    const name = parents ? `${parents} / ${bookmark.title}` : bookmark.title;

    if (bookmark.children && bookmark.children.length > 0) {
      const childBookmarks = extractBookmarksV2(bookmark.children, name, visited);
      bookmarks.push(...childBookmarks);
    }

    const item = new Bookmark(bookmark.url?.relative, name, bookmark.uniqueIdentifier);

    if (fs.existsSync(item.getPath)) {
      bookmarks.push(item);
    }
  });

  return bookmarks;
}

function extractBookmarksV3(
  obj: GitfoxRepositoryV3[],
  parents?: string,
  visited = new Set<GitfoxRepositoryV3>(),
): Bookmark[] {
  const bookmarks: Bookmark[] = [];

  if (!obj || obj.length === 0) {
    return bookmarks;
  }

  obj.forEach((bookmark: GitfoxRepositoryV3) => {
    if (visited.has(bookmark)) return; // Prevent cyclic references
    visited.add(bookmark);

    const name = parents ? `${parents} / ${bookmark.title}` : bookmark.title;

    if (bookmark.children && bookmark.children.length > 0) {
      const childBookmarks = extractBookmarksV3(bookmark.children, name, visited);
      bookmarks.push(...childBookmarks);
    }

    const item = new Bookmark(bookmark.kind?.repository?.url.relative, name, bookmark.id);

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
    const migratedToV3 = obj.didMigrateOldRepositoryManagerTreeNodes2;
    const itemsKey = migratedToV3 ? "repositoryManagerOutlineItems" : "repositoryManagerRepositoriesRootNode";
    const repos = (await bplist.parseFile(obj[itemsKey]))[0];

    const bookmarks = extractBookmarks(migratedToV3, repos);

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
