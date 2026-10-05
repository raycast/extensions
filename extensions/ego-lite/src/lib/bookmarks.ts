import { readFile } from "node:fs/promises";

import { activeProfilePath } from "./profile";

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  path: string;
  dateAdded?: string;
}

export interface BookmarkPaths {
  account: string;
  legacy: string;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function visitBookmarkNode(node: unknown, parentPath: string[], results: BookmarkItem[]): void {
  if (!isRecord(node)) return;

  if (node.type === "url" && typeof node.url === "string" && node.url.trim()) {
    const item: BookmarkItem = {
      id: typeof node.id === "string" ? node.id : node.url,
      title: typeof node.name === "string" && node.name.trim() ? node.name : node.url,
      url: node.url,
      path: parentPath.join(" › "),
    };
    if (typeof node.date_added === "string") item.dateAdded = node.date_added;
    results.push(item);
    return;
  }

  if (node.type !== "folder" || !Array.isArray(node.children)) return;

  const name = typeof node.name === "string" && node.name.trim() ? node.name : undefined;
  const currentPath = name ? [...parentPath, name] : parentPath;
  for (const child of node.children) {
    visitBookmarkNode(child, currentPath, results);
  }
}

export function flattenBookmarks(raw: unknown): BookmarkItem[] {
  if (!isRecord(raw) || !isRecord(raw.roots)) return [];

  const results: BookmarkItem[] = [];
  for (const node of Object.values(raw.roots)) {
    visitBookmarkNode(node, [], results);
  }
  return results;
}

export function filterBookmarks(items: BookmarkItem[], query: string): BookmarkItem[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return items;

  return items.filter((item) => `${item.title}\n${item.url}\n${item.path}`.toLocaleLowerCase().includes(needle));
}

async function readBookmarkFile(path: string): Promise<BookmarkItem[]> {
  try {
    return flattenBookmarks(JSON.parse(await readFile(path, "utf8")) as unknown);
  } catch {
    return [];
  }
}

export async function loadBookmarks(paths?: BookmarkPaths): Promise<BookmarkItem[]> {
  const resolvedPaths =
    paths ??
    ({
      account: await activeProfilePath("AccountBookmarks"),
      legacy: await activeProfilePath("Bookmarks"),
    } satisfies BookmarkPaths);

  const accountBookmarks = await readBookmarkFile(resolvedPaths.account);
  if (accountBookmarks.length > 0) return accountBookmarks;

  return readBookmarkFile(resolvedPaths.legacy);
}
