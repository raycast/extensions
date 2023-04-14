import _ from "lodash";
import { useState } from "react";
import { BookmarkListSection, PermissionError } from "./components";
import { useBookmarks } from "./hooks";
import { GeneralBookmark } from "./types";
import { search } from "./utils";
import { List } from "@raycast/api";
import BookmarksDropdown from "./components/BookmarksDropdown";

const Command = () => {
  const [searchText, setSearchText] = useState<string>("");
  const [selectedFolder, setSelectedFolder] = useState<string>("All Bookmarks");
  const { bookmarks, hasPermission } = useBookmarks(false);

  if (!hasPermission) {
    return <PermissionError />;
  }

  const groupedBookmarks = _.groupBy(bookmarks as GeneralBookmark[], ({ folder }) => folder);

  return (
    <List
      isLoading={!bookmarks}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <BookmarksDropdown
          folderNames={["All Bookmarks", ...Object.keys(groupedBookmarks)]}
          onSelection={setSelectedFolder}
        />
      }
    >
      {_.filter(groupedBookmarks, (bookmarks, key) =>
        selectedFolder == "All Bookmarks"
          ? true
          : selectedFolder == "Top Level Bookmarks"
          ? key == ""
          : key == selectedFolder
      ).map((bookmarks, key) => {
        const filteredBookmarks = search(bookmarks, ["title", "url", "description"], searchText) as GeneralBookmark[];

        return (
          <BookmarkListSection key={key} title={key.toString() || "Top Level Bookmarks"} filteredBookmarks={filteredBookmarks} />
        );
      })}
    </List>
  );
};

export default Command;
