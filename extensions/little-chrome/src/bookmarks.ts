import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CHROME_DIR } from "./blocklist";

export type Bookmark = { url: string; title: string; folder: string };

type BookmarkNode = { type?: string; name?: string; url?: string; children?: BookmarkNode[] };

// Local and account bookmarks of the profile, in Chrome's order, once per URL. The folder is the
// path below Chrome's root folders (bookmarks bar, other bookmarks), empty for bookmarks in a root.
export function loadBookmarks(profile: string): Bookmark[] {
  const bookmarks = new Map<string, Bookmark>();
  const walk = (node: BookmarkNode, path: string[]) => {
    if (node.type === "url" && node.url) {
      if (!bookmarks.has(node.url))
        bookmarks.set(node.url, { url: node.url, title: node.name ?? "", folder: path.join(" / ") });
    } else {
      for (const child of node.children ?? []) walk(child, node.name ? [...path, node.name] : path);
    }
  };
  for (const file of ["Bookmarks", "AccountBookmarks"]) {
    try {
      const roots: Record<string, BookmarkNode> = JSON.parse(
        readFileSync(join(CHROME_DIR, profile, file), "utf8"),
      ).roots;
      for (const root of Object.values(roots ?? {}))
        if (root && typeof root === "object") for (const child of root.children ?? []) walk(child, []);
    } catch {
      // no bookmarks of this kind
    }
  }
  return [...bookmarks.values()];
}

// Bookmarks whose title or URL contains every word, ignoring case.
export function matchBookmarks(bookmarks: Bookmark[], text: string): Bookmark[] {
  const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return bookmarks.filter((b) => {
    const haystack = `${b.title}\n${b.url}`.toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
}

// Bookmarks in the order of the used URLs, then (with unused) the rest in Chrome's order.
export function rankBookmarks(bookmarks: Bookmark[], used: { url: string }[], unused: boolean): Bookmark[] {
  const byUrl = new Map(bookmarks.map((b) => [b.url, b]));
  const ranked = used.map((u) => byUrl.get(u.url)).filter((b): b is Bookmark => !!b);
  if (!unused) return ranked;
  const rankedUrls = new Set(ranked.map((b) => b.url));
  return [...ranked, ...bookmarks.filter((b) => !rankedUrls.has(b.url))];
}
