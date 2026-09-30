import { List, LocalStorage } from "@raycast/api";
import _ from "lodash";
import { useEffect, useState } from "react";
import { BookmarkListSection, PermissionError } from "./components";
import BookmarksDropdown from "./components/BookmarksDropdown";
import { useBookmarks } from "./hooks";
import { GeneralBookmark } from "./types";
import { search } from "./utils";

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const [selectedFolder, setSelectedFolder] = useState<string>("All Bookmarks");
  const [tagColor, setTagColor] = useState<{ [key: string]: string }>({});
  const { bookmarks, hasPermission } = useBookmarks(false);

  const fetchTagColor = async () => {
    const tagColorLocalStorage = await LocalStorage.getItem("bookmarkTagColor");
    const tagColorObject = tagColorLocalStorage ? JSON.parse(tagColorLocalStorage as string) : {};
    setTagColor(tagColorObject);
  };

  useEffect(() => {
    fetchTagColor();
  }, []);

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
        const filteredBookmarks = search(
          bookmarks,
          [
            { name: "title", weight: 3 },
            { name: "url", weight: 1 },
            { name: "description", weight: 0.5 },
          ],
          searchText,
        ) as GeneralBookmark[];

        return (
          <BookmarkListSection
            key={key}
            title={key.toString() || "Top Level Bookmarks"}
            filteredBookmarks={filteredBookmarks}
            tagColor={tagColor}
            fetchTagColor={fetchTagColor}
          />
        );
      })}
    </List>
  );
}
