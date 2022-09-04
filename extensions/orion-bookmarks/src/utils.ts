import { URL } from "url";
import { homedir } from "os";
import { join } from "path";
import bplist from "bplist-parser";

// Path from here: https://browser.kagi.com/faq.html#techdoc
export const FAVORITE_ITEMS_DIR = join(homedir(), "/Library/Application Support/Orion/Defaults/favourites.plist");

interface OrionFavoriteItem {
  parentId: string;
  unmodifiable: string;
  id: string;
  title: string;
  dateAdded: number;
  type: string;
  index: number;
  url?: string;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  folders: string[];
  dateAdded: Date;
}

export async function getBookmarks() {
  const bookmarksPlist = bplist.parseFileSync(FAVORITE_ITEMS_DIR);
  const items = Object.values(bookmarksPlist[0]) as OrionFavoriteItem[];
  const folders = parseFolderNames(items);
  return parseBookmarks(items, folders);
}

function parseFolderNames(items: OrionFavoriteItem[]): Map<string, string> {
  return items
    .filter((item) => item.type === "folder")
    .reduce((folders, currentValue) => {
      folders.set(currentValue.id, currentValue.title || "Favorites");
      return folders;
    }, new Map<string, string>());
}

function parseBookmarks(items: OrionFavoriteItem[], folders: Map<string, string>) {
  return items
    .filter((item) => item.type === "bookmark")
    .filter((item) => !!item.url)
    .map((oBookmark) => {
      const folder = folders.get(oBookmark.parentId);
      const bookmark: Bookmark = {
        id: oBookmark.id,
        title: oBookmark.title,
        url: oBookmark.url!,
        folders: folder ? [folder] : [],
        dateAdded: new Date(oBookmark.dateAdded),
      };
      return bookmark;
    }).reduce((deduped, current) => {
      const existing = deduped.find(bkmk => bkmk.title === current.title && bkmk.url === current.url);
      if (existing) {
        existing.folders = unique(existing.folders.concat(current.folders));
      } else {
        deduped.push(current);
      }
      return deduped;
    }, [] as Bookmark[]);
}

export function extractDomainName(urlString: string) {
  const url = new URL(urlString);
  return url.host;
}

function unique(strings: string[]) {
  return strings.filter((str, index) => strings.indexOf(str) === index)
}
