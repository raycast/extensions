import { useState } from "react";
import { PermissionError } from "./components";
import { useBookmarks } from "./hooks";
import { GeneralBookmark } from "./types";
import { search } from "./utils";
import { List } from "@raycast/api";
import BookmarkListItem from "./components/BookmarkListItem";

const Command = () => {
  const [searchText, setSearchText] = useState<string>("");
  const { bookmarks, hasPermission } = useBookmarks(false);

  if (!hasPermission) {
    return <PermissionError />;
  }

  const filteredBookmarks = search(bookmarks || [], ["title", "url"], searchText) as GeneralBookmark[];

  return (
    <List isLoading={!bookmarks} onSearchTextChange={setSearchText}>
      {filteredBookmarks.map((bookmark) => (
        <BookmarkListItem key={bookmark.uuid} bookmark={bookmark} />
      ))}
    </List>
  );
};

export default Command;
