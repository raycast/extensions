import Fuse from "fuse.js";

type SearchableBookmark = {
  title: string;
  domain: string;
  folder: string;
  searchFolder?: string;
};

// Folder path without the browser's root folder (e.g. "Bookmarks Bar"), whose name is shared by most bookmarks.
export function getSearchFolder(rootName: string, folder: string) {
  return folder.slice(rootName.length + 1);
}

export function createBookmarkSearch<T extends SearchableBookmark>(bookmarks: T[], threshold: number) {
  return new Fuse(bookmarks, {
    keys: [
      { name: "title", weight: 3 },
      { name: "domain", weight: 1 },
      {
        name: "folder",
        weight: 0.5,
        // Search the subfolders only: the root folder can't be renamed, so matching it (e.g. "bar")
        // would return nearly every bookmark.
        getFn: (item) => item.searchFolder ?? item.folder,
      },
    ],
    threshold,
    includeScore: true,
    ignoreLocation: true,
  });
}
