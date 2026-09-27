import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { CHROME_DATA_DIR } from "./chrome";
import { ProfileLink } from "./storage";

/** Chrome keeps local and account (signed-in) bookmarks in separate files. */
const BOOKMARK_FILES = ["Bookmarks", "AccountBookmarks"];

interface BookmarkNode {
  type: "url" | "folder";
  guid: string;
  name: string;
  url?: string;
  children?: BookmarkNode[];
}

interface BookmarkFile {
  roots: Record<string, BookmarkNode | undefined>;
}

export interface BookmarkLink extends ProfileLink {
  profileDirectory: string;
  /** Folder path inside the bookmark bar / other bookmarks, e.g. ["Dev", "Docs"]. */
  folders: string[];
}

export function isBookmarkId(id: string): boolean {
  return id.startsWith("bookmark:");
}

function collect(node: BookmarkNode, folders: string[], profileDirectory: string, out: BookmarkLink[]) {
  if (node.type === "url") {
    if (node.url && /^(https?|file):/.test(node.url)) {
      out.push({
        id: `bookmark:${profileDirectory}:${node.guid}`,
        title: node.name || node.url,
        url: node.url,
        profileDirectory,
        tags: folders,
        folders,
        createdAt: 0,
      });
    }
    return;
  }
  for (const child of node.children ?? []) {
    collect(child, [...folders, node.name], profileDirectory, out);
  }
}

async function readBookmarkFile(profileDirectory: string, file: string): Promise<BookmarkLink[]> {
  let raw: string;
  try {
    raw = await readFile(join(CHROME_DATA_DIR, profileDirectory, file), "utf8");
  } catch {
    return []; // The profile has no bookmarks of this kind.
  }
  const out: BookmarkLink[] = [];
  for (const root of Object.values((JSON.parse(raw) as BookmarkFile).roots)) {
    // Root folders ("Bookmarks bar", "Other bookmarks"…) are not useful as tags, so start below them.
    for (const child of root?.children ?? []) {
      collect(child, [], profileDirectory, out);
    }
  }
  return out;
}

/** Reads the bookmarks of every profile. They are always read fresh, so edits in Chrome show up immediately. */
export async function getChromeBookmarks(profileDirectories: string[]): Promise<BookmarkLink[]> {
  const perFile = await Promise.all(
    profileDirectories.flatMap((directory) => BOOKMARK_FILES.map((file) => readBookmarkFile(directory, file))),
  );
  const seen = new Set<string>();
  return perFile.flat().filter((bookmark) => {
    // A bookmark can exist both locally and in the account file.
    const key = `${bookmark.profileDirectory}\n${bookmark.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getChromeBookmark(id: string): Promise<BookmarkLink | undefined> {
  const [, profileDirectory] = id.split(":");
  return (await getChromeBookmarks([profileDirectory])).find((bookmark) => bookmark.id === id);
}
