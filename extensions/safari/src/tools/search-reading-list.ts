import { getPreferenceValues } from "@raycast/api";
import { extractReadingListBookmarks, PLIST_PATH, readPlist } from "../hooks/useBookmarks";
import { BookmarkPListResult, ReadingListBookmark } from "../types";
import { getSearchLimit, limitResults, search, withFullDiskAccess } from "../utils";
import { filter } from "lodash";

type Input = {
  /**
   * The text to search for in the reading list.
   *
   * @remarks
   * Omit it to list the reading list, most recently added first.
   */
  searchText?: string;

  /**
   * The maximum number of items to return.
   *
   * @default 50
   * @remarks
   * Capped at 100.
   */
  searchLimit?: number;
};

/**
 * Searches the Safari Reading List.
 * `truncated` is true when more items match than were returned.
 */
export default async function tool(input: Input) {
  const { hideReadItems } = getPreferenceValues<Preferences.ReadingList>();
  const safariBookmarksPlist = (await withFullDiskAccess("Reading List", () =>
    readPlist(PLIST_PATH),
  )) as BookmarkPListResult;
  const bookmarks = extractReadingListBookmarks(safariBookmarksPlist, true);
  const filtered = hideReadItems
    ? filter(bookmarks as ReadingListBookmark[], ({ dateLastViewed }) => !dateLastViewed)
    : bookmarks;
  const filteredBookmarks = search(
    filtered,
    [
      { name: "title", weight: 3 },
      { name: "url", weight: 1 },
      { name: "description", weight: 0.5 },
    ],
    input.searchText?.trim() ?? "",
  ) as ReadingListBookmark[];

  return limitResults(filteredBookmarks, getSearchLimit(input.searchLimit));
}
