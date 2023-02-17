import { List } from "@raycast/api";
import { useSearchBookmarks } from "./api";
import { BookmarkListItem, EmptyView } from "./components";
import { Bookmark } from "./types";
import { deleteItem } from "./utils";

export default function Command() {
  const { data, isLoading, mutate } = useSearchBookmarks();

  async function deleteBookmark(bookmark: Bookmark) {
    await deleteItem({ bookmark, mutate });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search by name or #tag...">
      <EmptyView />
      {data?.bookmarks &&
        data.bookmarks.map((bookmark) => (
          <BookmarkListItem key={bookmark.id} bookmark={bookmark} onDelete={deleteBookmark} />
        ))}
    </List>
  );
}
