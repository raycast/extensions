import { extractReadingListBookmarks, PLIST_PATH, readPlist } from "../hooks/useBookmarks";
import { BookmarkPListResult, GeneralBookmark } from "../types";
import { getSearchLimit, limitResults, search, withFullDiskAccess } from "../utils";

type Input = {
  /**
   * The text to search for in the bookmarks.
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
  searchLimit?: number;
};

/**
 * Searches the Safari bookmarks and returns each match with its folder.
 * `truncated` is true when more bookmarks match than were returned.
 */
export default async function tool(input: Input) {
  const safariBookmarksPlist = (await withFullDiskAccess("bookmarks", () =>
    readPlist(PLIST_PATH),
  )) as BookmarkPListResult;
  const bookmarks = extractReadingListBookmarks(safariBookmarksPlist, false);
  const filteredBookmarks = search(
    bookmarks,
    [
      { name: "title", weight: 3 },
      { name: "url", weight: 1 },
      { name: "description", weight: 0.5 },
    ],
    input.searchText?.trim() ?? "",
  ) as GeneralBookmark[];
  return limitResults(filteredBookmarks, getSearchLimit(input.searchLimit));
}
