import { readFile } from "node:fs/promises";
import path from "node:path";
import type { BrowserEntry, Profile } from "../types";

interface BookmarkNode {
  id?: string;
  guid?: string;
  type?: string;
  name?: string;
  url?: string;
  children?: BookmarkNode[];
}

export function parseBookmarks(
  raw: unknown,
  profile: Profile,
  file: string,
): BrowserEntry[] {
  if (
    !raw ||
    typeof raw !== "object" ||
    !("roots" in raw) ||
    !raw.roots ||
    typeof raw.roots !== "object"
  ) {
    throw new Error("书签文件格式无效");
  }
  const entries: BrowserEntry[] = [];
  function visit(node: BookmarkNode, folders: string[]) {
    if (node.type === "url" && typeof node.url === "string" && node.url) {
      entries.push({
        id: `bookmark:${profile.id}:${file}:${node.guid || node.id || entries.length}`,
        source: "bookmark",
        title: node.name || node.url,
        url: node.url,
        profile,
        folder: folders.join(" / "),
      });
    } else if (Array.isArray(node.children)) {
      const next = node.name ? [...folders, node.name] : folders;
      node.children.forEach((child) => visit(child, next));
    }
  }
  Object.values(raw.roots).forEach((node) => visit(node as BookmarkNode, []));
  return entries;
}

export async function readBookmarks(
  profile: Profile,
): Promise<{ entries: BrowserEntry[]; warnings: string[] }> {
  const entries: BrowserEntry[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (const file of ["Bookmarks", "AccountBookmarks"]) {
    try {
      const parsed = parseBookmarks(
        JSON.parse(await readFile(path.join(profile.path, file), "utf8")),
        profile,
        file,
      );
      // 仅合并双文件中同目录、同名称、同地址的记录，保留不同目录的有意重复收藏。
      for (const entry of parsed) {
        const key = JSON.stringify([entry.folder, entry.title, entry.url]);
        if (!seen.has(key)) entries.push(entry);
        seen.add(key);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT")
        warnings.push(`${profile.name}：${file} 读取失败`);
    }
  }
  return { entries, warnings };
}
