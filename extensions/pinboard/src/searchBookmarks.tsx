import { List } from "@raycast/api";
import { useState } from "react";
import { usePinboardBookmarks } from "./hooks/usePinboardBookmarks";
import { BookmarkListItem, EmptyView } from "./components";

export default function Command() {
  const [readLater, setReadLater] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const { bookmarks, isLoading, setSearchText, removeBookmark } = usePinboardBookmarks({
    readLater: readLater || undefined,
  });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search bookmarks… use #tag to filter by tag"
      searchBarAccessory={<ReadLaterDropdown onChange={setReadLater} />}
    >
      <EmptyView />
      {bookmarks.map((bookmark) => (
        <BookmarkListItem
          key={bookmark.id}
          bookmark={bookmark}
          onDelete={removeBookmark}
          showDetail={showDetail}
          onToggleDetail={() => setShowDetail((prev) => !prev)}
        />
      ))}
    </List>
  );
}

function ReadLaterDropdown({ onChange }: { onChange: (value: boolean) => void }) {
  return (
    <List.Dropdown tooltip="Filter" storeValue onChange={(value) => onChange(value === "readLater")}>
      <List.Dropdown.Item title="All Bookmarks" value="all" />
      <List.Dropdown.Item title="Read Later" value="readLater" />
    </List.Dropdown>
  );
}
