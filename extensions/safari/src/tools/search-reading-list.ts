import { getPreferenceValues } from "@raycast/api";
import { filter } from "lodash";

import { extractReadingListBookmarks, readPlist } from "../hooks/useBookmarks";
import { BookmarkPListResult, ReadingListBookmark } from "../types";
import { PLIST_PATH } from "../constants";
import { search } from "../utils";

type Input = {
  /**
   * The text to search for in the reading list.
   */
  searchText: string;
};

const tool = async (input: Input) => {
  const { hideReadItems } = getPreferenceValues<Preferences.ReadingList>();
  const safariBookmarksPlist = (await readPlist(PLIST_PATH)) as BookmarkPListResult;
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
    input.searchText,
  ) as ReadingListBookmark[];

  return filteredBookmarks;
};

export default tool;
