import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";

export type ChromiumFileSystem = {
  readFile: (path: string, encoding: BufferEncoding) => Promise<string>;
  readdir: (path: string) => Promise<{ name: string; isDirectory: () => boolean }[]>;
  stat: (path: string) => Promise<unknown>;
};

export type ChromiumProfile = {
  path: string;
  name: string;
};

export type ChromiumProfilesResult = {
  profiles: ChromiumProfile[];
  defaultProfile: string;
};

const CHROMIUM_BOOKMARK_FILE_NAMES = ["Bookmarks", "AccountBookmarks"] as const;

const defaultFileSystem: ChromiumFileSystem = {
  readFile: (path, encoding) => readFile(path, encoding),
  readdir: (path) => readdir(path, { withFileTypes: true }),
  stat: (path) => stat(path),
};

export function isFileNotFoundError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}

export function isFileAccessPermissionError(error: unknown) {
  if (!error) {
    return false;
  }

  const code = typeof error === "object" && "code" in error ? error.code : undefined;
  const message =
    typeof error === "string" ? error : typeof error === "object" && "message" in error ? String(error.message) : "";
  return code === "EPERM" || code === "EACCES" || /operation not permitted|permission denied/i.test(message);
}

async function hasChromiumBookmarksFile(path: string, profile: string, fileSystem: ChromiumFileSystem) {
  for (const fileName of CHROMIUM_BOOKMARK_FILE_NAMES) {
    try {
      await fileSystem.stat(join(path, profile, fileName));
      return true;
    } catch (error) {
      if (!isFileNotFoundError(error)) {
        throw error;
      }
    }
  }

  return false;
}

async function getChromiumProfilesFallback(
  path: string,
  fileSystem: ChromiumFileSystem,
): Promise<ChromiumProfilesResult> {
  let entries;
  try {
    entries = await fileSystem.readdir(path);
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return { profiles: [], defaultProfile: "" };
    }
    throw error;
  }

  const profiles: ChromiumProfile[] = [];
  for (const entry of entries) {
    if (entry.isDirectory() && (await hasChromiumBookmarksFile(path, entry.name, fileSystem))) {
      profiles.push({ path: entry.name, name: entry.name });
    }
  }

  profiles.sort((a, b) => a.name.localeCompare(b.name));
  const defaultProfile = profiles.find((profile) => profile.path === "Default")?.path || profiles[0]?.path || "";

  return { profiles, defaultProfile };
}

export async function getChromiumProfiles(
  path: string,
  fileSystem: ChromiumFileSystem = defaultFileSystem,
): Promise<ChromiumProfilesResult> {
  let file: string;
  try {
    file = await fileSystem.readFile(join(path, "Local State"), "utf-8");
  } catch {
    return getChromiumProfilesFallback(path, fileSystem);
  }

  let localState;
  try {
    localState = JSON.parse(file);
  } catch {
    return getChromiumProfilesFallback(path, fileSystem);
  }

  const profileInfoCache = (localState as { profile?: { info_cache?: Record<string, { name?: string }> } }).profile
    ?.info_cache;

  if (!profileInfoCache || typeof profileInfoCache !== "object" || Array.isArray(profileInfoCache)) {
    return getChromiumProfilesFallback(path, fileSystem);
  }

  const profiles: ChromiumProfile[] = [];
  for (const [profilePath, profile] of Object.entries(profileInfoCache)) {
    if (await hasChromiumBookmarksFile(path, profilePath, fileSystem)) {
      profiles.push({ path: profilePath, name: profile.name ?? profilePath });
    }
  }

  if (profiles.length === 0) {
    return getChromiumProfilesFallback(path, fileSystem);
  }

  const lastUsed = (localState as { profile?: { last_used?: string } }).profile?.last_used;
  const defaultProfile = profiles.find((profile) => profile.path === lastUsed)?.path || profiles[0]?.path || "";

  profiles.sort((a, b) => a.name.localeCompare(b.name));
  return { profiles, defaultProfile };
}

export type ChromiumBookmarkURL = {
  guid: string;
  name: string;
  url: string;
  type: "url";
};

export type ChromiumBookmarkFolder = {
  guid: string;
  name: string;
  type: "folder";
  children: ChromiumBookmarkItem[];
};

export type ChromiumBookmarkItem = ChromiumBookmarkURL | ChromiumBookmarkFolder;

export type ChromiumBookmarksRoot = {
  roots: {
    bookmark_bar: ChromiumBookmarkFolder;
    other: ChromiumBookmarkFolder;
  } & Record<string, ChromiumBookmarkFolder | undefined>;
};

export type ChromiumBookmarksFileSystem = {
  readFile: (path: string) => Promise<Buffer | string>;
};

const defaultBookmarksFileSystem: ChromiumBookmarksFileSystem = {
  readFile: (path) => readFile(path),
};

function countBookmarks(bookmark: ChromiumBookmarkItem): number {
  if (bookmark.type === "url") {
    return 1;
  }

  return bookmark.children?.reduce((count, child) => count + countBookmarks(child), 0) ?? 0;
}

function getBookmarkCount(bookmarksRoot: ChromiumBookmarksRoot) {
  return Object.values(bookmarksRoot.roots).reduce((count, root) => count + (root ? countBookmarks(root) : 0), 0);
}

async function readOptionalChromiumFile(filePath: string, fileSystem: ChromiumBookmarksFileSystem) {
  try {
    return await fileSystem.readFile(filePath);
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return;
    }
    throw error;
  }
}

export async function readChromiumBookmarks(
  path: string,
  profile: string,
  fileSystem: ChromiumBookmarksFileSystem = defaultBookmarksFileSystem,
): Promise<ChromiumBookmarksRoot | undefined> {
  const accountBookmarksPath = join(path, profile, "AccountBookmarks");

  try {
    const accountBookmarksFile = await readOptionalChromiumFile(accountBookmarksPath, fileSystem);
    if (accountBookmarksFile) {
      const accountBookmarks = JSON.parse(accountBookmarksFile.toString()) as ChromiumBookmarksRoot;
      if (getBookmarkCount(accountBookmarks) > 0) {
        return accountBookmarks;
      }
    }
  } catch (error) {
    if (isFileAccessPermissionError(error)) {
      throw error;
    }
    // Fall back to the legacy Bookmarks file if the account file is missing or invalid.
  }

  const bookmarksPath = join(path, profile, "Bookmarks");
  const bookmarksFile = await readOptionalChromiumFile(bookmarksPath, fileSystem);
  return bookmarksFile ? (JSON.parse(bookmarksFile.toString()) as ChromiumBookmarksRoot) : undefined;
}
