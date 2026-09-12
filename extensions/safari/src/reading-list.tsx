import { getPreferenceValues, List } from "@raycast/api";
import _ from "lodash";
import { useState } from "react";
import { PermissionError, ReadingListSection } from "./components";
import { useBookmarks } from "./hooks";
import { ReadingListBookmark } from "./types";
import { search } from "./utils";

type Preferences = {
  groupByStatus: boolean;
  hideReadItems: boolean;
};

const { groupByStatus, hideReadItems }: Preferences = getPreferenceValues();

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const { bookmarks, hasPermission } = useBookmarks(true);

  if (!hasPermission) {
    return <PermissionError />;
  }

  const filteredBookmarks = hideReadItems
    ? _.filter(bookmarks as ReadingListBookmark[], ({ dateLastViewed }) => !dateLastViewed)
    : bookmarks;

  const groupedBookmarks = groupByStatus
    ? _.groupBy(filteredBookmarks as ReadingListBookmark[], ({ dateLastViewed }) =>
        dateLastViewed ? "read" : "unread",
      )
    : { All: filteredBookmarks || [] };

  return (
    <List isLoading={!bookmarks} onSearchTextChange={setSearchText}>
      {_.map(groupedBookmarks, (bookmarks, key) => {
        const filteredBookmarks = search(
          bookmarks,
          [
            { name: "title", weight: 3 },
            { name: "url", weight: 1 },
            { name: "description", weight: 0.5 },
          ],
          searchText,
        ) as ReadingListBookmark[];

        return <ReadingListSection key={key} title={key} filteredBookmarks={filteredBookmarks} />;
      })}
    </List>
  );
}
