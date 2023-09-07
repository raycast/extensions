import { List } from "@raycast/api";
import useBookmarks from "./hooks/useBookmarks";
import BookmarkListItem from "./components/BookmarkListItem";
import BookmarksFolderDropdown from "src/components/BookmarksFolderDropdown";
import { useState } from "react";

export default function Command() {
  const { folders, bookmarks, isLoading } = useBookmarks();
  const [folder, setFolder] = useState<string>("");

  const filteredBookmarks = folder ? bookmarks?.filter((bookmark) => bookmark.folders.includes(folder)) : bookmarks;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search by title, domain name, or folder"
      searchBarAccessory={<BookmarksFolderDropdown folders={folders} onChange={setFolder} />}
    >
      {filteredBookmarks &&
        filteredBookmarks.map((bookmark) => <BookmarkListItem key={bookmark.uuid} bookmark={bookmark} />)}
    </List>
  );
}
