import _ from "lodash";
import { useState } from "react";

import { getPreferenceValues, List } from "@raycast/api";

import { PermissionError, ReadingListSection } from "./components";
import { useBookmarks } from "./hooks";
import { ReadingListBookmark } from "./types";
import { search } from "./utils";

type Preferences = {
  groupByStatus: boolean;
};

const { groupByStatus }: Preferences = getPreferenceValues();

const Command = () => {
  const [searchText, setSearchText] = useState<string>("");
  const { bookmarks, hasPermission } = useBookmarks();

  if (!hasPermission) {
    return <PermissionError />;
  }

  const groupedBookmarks = groupByStatus
    ? _.groupBy(bookmarks, ({ dateLastViewed }) => (dateLastViewed ? "read" : "unread"))
    : { All: bookmarks || [] };

  return (
    <List isLoading={!bookmarks} onSearchTextChange={setSearchText}>
      {_.map(groupedBookmarks, (bookmarks, key) => {
        const filteredBookmarks = search(
          bookmarks,
          ["title", "url", "description"],
          searchText
        ) as ReadingListBookmark[];

        return <ReadingListSection key={key} title={key} filteredBookmarks={filteredBookmarks} />;
      })}
    </List>
  );
};

export default Command;
