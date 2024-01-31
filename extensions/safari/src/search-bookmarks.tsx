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

  const folderNames = Object.keys(_.groupBy(bookmarks as GeneralBookmark[], ({ folder }) => folder));

  const groupedBookmarks = _.groupBy(
    (bookmarks as GeneralBookmark[])?.filter((bookmark) =>
      selectedFolder == "All Bookmarks"
        ? true
        : selectedFolder == "Top Level Bookmarks"
          ? bookmark.folder == ""
          : bookmark.folder == selectedFolder,
    ),
    ({ folder }) => folder,
  );

  return (
    <List
      isLoading={!bookmarks}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <BookmarksDropdown folderNames={["All Bookmarks", ...folderNames]} onSelection={setSelectedFolder} />
      }
    >
      {_.map(groupedBookmarks, (bookmarks, key) => {
        const filteredBookmarks = search(bookmarks, ["title", "url", "description"], searchText) as GeneralBookmark[];

        return (
          <BookmarkListSection
            key={key}
            title={key.toString() || "Top Level Bookmarks"}
            filteredBookmarks={filteredBookmarks}
          />
        );
      })}
    </List>
  );
};

export default Command;
