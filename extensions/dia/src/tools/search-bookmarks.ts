import { getBookmarksTree, searchAllBookmarks } from "../bookmarks";
import { FULL_DISK_ACCESS_MESSAGE } from "../dia";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

type Input = {
  /**
   * Words to search for in bookmark names and URLs. Every word must match; prefix a word with "-" to exclude it.
   *
   * @remarks
   * Omit it to list bookmarks.
   */
  searchText?: string;

  /**
   * The maximum number of bookmarks to return.
   *
   * @default 50
   * @remarks
   * Capped at 100.
   */
  limit?: number;
};

/**
 * Searches the Dia bookmarks of the active profile and returns each match with its folder.
 */
export default async function tool(input: Input) {
  const limit = Math.min(Math.max(Math.floor(input.limit ?? DEFAULT_LIMIT), 1), MAX_LIMIT);

  let tree;
  try {
    tree = await getBookmarksTree();
  } catch (error) {
    if (error instanceof Error && "code" in error && (error.code === "EPERM" || error.code === "EACCES")) {
      throw new Error(FULL_DISK_ACCESS_MESSAGE);
    }
    throw error;
  }

  return searchAllBookmarks(tree, input.searchText?.trim() ?? "")
    .filter((bookmark) => bookmark.type === "url" && bookmark.url)
    .slice(0, limit)
    .map((bookmark) => ({
      name: bookmark.name,
      url: bookmark.url,
      folder: bookmark.path.slice(0, -1).join(" › "),
    }));
}
