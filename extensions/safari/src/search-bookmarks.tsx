import _ from "lodash";
import { useState } from "react";
import { BookmarkListSection, PermissionError } from "./components";
import { useBookmarks } from "./hooks";
import { GeneralBookmark } from "./types";
import { search } from "./utils";
import { List } from "@raycast/api";

const Command = () => {
  const [searchText, setSearchText] = useState<string>("");
  const { bookmarks, hasPermission } = useBookmarks(false);

  if (!hasPermission) {
    return <PermissionError />;
  }

  const groupedBookmarks = _.groupBy(bookmarks as GeneralBookmark[], ({ folder }) => folder);

  return (
    <List isLoading={!bookmarks} onSearchTextChange={setSearchText}>
      {_.map(groupedBookmarks, (bookmarks, key) => {
        const filteredBookmarks = search(bookmarks, ["title", "url", "description"], searchText) as GeneralBookmark[];

        return (
          <BookmarkListSection key={key} title={key || "Top Level Bookmarks"} filteredBookmarks={filteredBookmarks} />
        );
      })}
    </List>
  );
};

export default Command;
