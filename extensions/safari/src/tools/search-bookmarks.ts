import { extractReadingListBookmarks, PLIST_PATH, readPlist } from "../hooks/useBookmarks";
import { BookmarkPListResult, GeneralBookmark } from "../types";
import { search } from "../utils";

type Input = {
  /**
   * The text to search for in the bookmarks.
   */
  searchText: string;
};

export default async function tool(input: Input) {
  const safariBookmarksPlist = (await readPlist(PLIST_PATH)) as BookmarkPListResult;
  const bookmarks = extractReadingListBookmarks(safariBookmarksPlist, false);
  const filteredBookmarks = search(
    bookmarks,
    [
      { name: "title", weight: 3 },
      { name: "url", weight: 1 },
      { name: "description", weight: 0.5 },
    ],
    input.searchText,
  ) as GeneralBookmark[];
  return filteredBookmarks;
}
