import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fs from "fs";
import os from "os";
import path from "path";
import bplist from "bplist-parser";
import Bookmark from "./dtos/bookmark-dto";
import GitfoxRepositories, {
  GitfoxRepositoryV2,
  GitfoxRepositoryV3,
  GitfoxRepositoryV4,
} from "./interfaces/imported-gitfox-bookmark";
import GitfoxPreferences from "./interfaces/gitfox-preferences";
import { BookmarkGroup } from "./interfaces/bookmark-group";

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
  } catch {
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

type PlistVersion = "v2" | "v3" | "v4";

function extractBookmarks(
  version: PlistVersion,
  obj: GitfoxRepositories | GitfoxRepositoryV3[] | GitfoxRepositoryV4[],
): Bookmark[] {
  switch (version) {
    case "v4":
      return extractBookmarksV4(obj as GitfoxRepositoryV4[]);
    case "v3":
      return extractBookmarksV3(obj as GitfoxRepositoryV3[]);
    case "v2":
    default:
      return extractBookmarksV2((obj as GitfoxRepositories).children);
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

    if (bookmark.url?.relative) {
      const item = new Bookmark(bookmark.url.relative, name, bookmark.uniqueIdentifier);
      if (fs.existsSync(item.getPath)) {
        bookmarks.push(item);
      }
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

    if (bookmark.kind?.repository) {
      const item = new Bookmark(bookmark.kind.repository.url.relative, name, bookmark.id);
      if (fs.existsSync(item.getPath)) {
        bookmarks.push(item);
      }
    }
  });

  return bookmarks;
}

function extractBookmarksV4(
  obj: GitfoxRepositoryV4[],
  parents?: string,
  visited = new Set<GitfoxRepositoryV4>(),
): Bookmark[] {
  const bookmarks: Bookmark[] = [];

  if (!obj || obj.length === 0) {
    return bookmarks;
  }

  obj.forEach((bookmark: GitfoxRepositoryV4) => {
    if (visited.has(bookmark)) return; // Prevent cyclic references
    visited.add(bookmark);

    const name = parents ? `${parents} / ${bookmark.title}` : bookmark.title;

    if (bookmark.children && bookmark.children.length > 0) {
      const childBookmarks = extractBookmarksV4(bookmark.children, name, visited);
      bookmarks.push(...childBookmarks);
    }

    if (bookmark.kind?.repository) {
      const item = new Bookmark(bookmark.kind.repository.url.relative, name, bookmark.kind.repository.id);
      if (fs.existsSync(item.getPath)) {
        bookmarks.push(item);
      }
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

    let version: PlistVersion;
    let repos;

    if (obj["repositories"]) {
      version = "v4";
      const rawData = obj["repositories"];
      repos = Buffer.isBuffer(rawData) ? (await bplist.parseFile(rawData))[0] : rawData;
    } else {
      const migratedToV3 = obj.didMigrateOldRepositoryManagerTreeNodes2;
      version = migratedToV3 ? "v3" : "v2";
      const itemsKey = migratedToV3 ? "repositoryManagerOutlineItems" : "repositoryManagerRepositoriesRootNode";
      repos = (await bplist.parseFile(obj[itemsKey]))[0];
    }

    const bookmarks = extractBookmarks(version, repos);

    return Promise.resolve(bookmarks);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Something went wrong",
      message: "Could not load the Gitfox bookmarks.",
    });
    return Promise.resolve([]);
  }
}

function extractGroupedV2(obj: GitfoxRepositoryV2[]): BookmarkGroup[] {
  const ungrouped: Bookmark[] = [];
  const groups: BookmarkGroup[] = [];

  if (!obj) return [];

  for (const item of obj) {
    if (item.children && item.children.length > 0 && !item.url) {
      const folderBookmarks: Bookmark[] = [];
      extractBookmarksV2(item.children).forEach((bm) => folderBookmarks.push(bm));
      if (folderBookmarks.length > 0) {
        groups.push({ name: item.title, id: item.uniqueIdentifier, bookmarks: folderBookmarks });
      }
    } else {
      const bm = new Bookmark(item.url?.relative, item.title, item.uniqueIdentifier);
      if (fs.existsSync(bm.getPath)) {
        ungrouped.push(bm);
      }
    }
  }

  const result: BookmarkGroup[] = [];
  if (ungrouped.length > 0) {
    result.push({ name: "", id: "ungrouped", bookmarks: ungrouped });
  }
  result.push(...groups);
  return result;
}

function extractGroupedV3(obj: GitfoxRepositoryV3[]): BookmarkGroup[] {
  const ungrouped: Bookmark[] = [];
  const groups: BookmarkGroup[] = [];

  if (!obj) return [];

  for (const item of obj) {
    if (item.children && item.children.length > 0 && item.kind?.folder !== undefined) {
      const folderBookmarks: Bookmark[] = [];
      extractBookmarksV3(item.children).forEach((bm) => folderBookmarks.push(bm));
      if (folderBookmarks.length > 0) {
        groups.push({ name: item.title, id: item.id, bookmarks: folderBookmarks });
      }
    } else if (item.kind?.repository) {
      const bm = new Bookmark(item.kind.repository.url.relative, item.title, item.id);
      if (fs.existsSync(bm.getPath)) {
        ungrouped.push(bm);
      }
    }
  }

  const result: BookmarkGroup[] = [];
  if (ungrouped.length > 0) {
    result.push({ name: "", id: "ungrouped", bookmarks: ungrouped });
  }
  result.push(...groups);
  return result;
}

function extractGroupedV4(obj: GitfoxRepositoryV4[]): BookmarkGroup[] {
  const ungrouped: Bookmark[] = [];
  const groups: BookmarkGroup[] = [];

  if (!obj) return [];

  for (const item of obj) {
    if (item.kind?.folder && item.children && item.children.length > 0) {
      const folderBookmarks: Bookmark[] = [];
      extractBookmarksV4(item.children).forEach((bm) => folderBookmarks.push(bm));
      if (folderBookmarks.length > 0) {
        groups.push({ name: item.title, id: item.kind.folder.id, bookmarks: folderBookmarks });
      }
    } else if (item.kind?.repository) {
      const id = item.kind.repository.id;
      const bm = new Bookmark(item.kind.repository.url.relative, item.title, id);
      if (fs.existsSync(bm.getPath)) {
        ungrouped.push(bm);
      }
    }
  }

  const result: BookmarkGroup[] = [];
  if (ungrouped.length > 0) {
    result.push({ name: "", id: "ungrouped", bookmarks: ungrouped });
  }
  result.push(...groups);
  return result;
}

function extractBookmarkGroups(
  version: PlistVersion,
  obj: GitfoxRepositories | GitfoxRepositoryV3[] | GitfoxRepositoryV4[],
): BookmarkGroup[] {
  switch (version) {
    case "v4":
      return extractGroupedV4(obj as GitfoxRepositoryV4[]);
    case "v3":
      return extractGroupedV3(obj as GitfoxRepositoryV3[]);
    case "v2":
    default:
      return extractGroupedV2((obj as GitfoxRepositories).children);
  }
}

export async function fetchBookmarkGroups(): Promise<BookmarkGroup[]> {
  try {
    if (plistLocations.length === 0) {
      throw new Error();
    }

    const preferencesPlist = plistLocations[0];
    const obj = (await bplist.parseFile(fs.readFileSync(preferencesPlist)))[0];

    let version: PlistVersion;
    let repos;

    if (obj["repositories"]) {
      version = "v4";
      const rawData = obj["repositories"];
      repos = Buffer.isBuffer(rawData) ? (await bplist.parseFile(rawData))[0] : rawData;
    } else {
      const migratedToV3 = obj.didMigrateOldRepositoryManagerTreeNodes2;
      version = migratedToV3 ? "v3" : "v2";
      const itemsKey = migratedToV3 ? "repositoryManagerOutlineItems" : "repositoryManagerRepositoriesRootNode";
      repos = (await bplist.parseFile(obj[itemsKey]))[0];
    }

    return extractBookmarkGroups(version, repos);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Something went wrong",
      message: "Could not load the Gitfox bookmarks.",
    });
    return [];
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
