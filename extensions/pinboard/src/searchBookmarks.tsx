import { List } from "@raycast/api";
import { deleteBookmark, useSearchBookmarks } from "./api";
import { BookmarkListItem, EmptyView } from "./components";
import { Bookmark, BookmarksResponse } from "./types";

export default function Command() {
  const { data, isLoading, mutate } = useSearchBookmarks();

  async function deleteItem(bookmark: Bookmark) {
    try {
      await mutate(deleteBookmark(bookmark), {
        optimisticUpdate(data?: BookmarksResponse) {
          if (data) {
            return {
              ...data,
              bookmarks: data.bookmarks.filter((bookmarkItem) => bookmarkItem.url !== bookmark.url),
            };
          }
        },
      });
    } catch (error) {
      console.error("addBookmark error", error);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search by name or #tag...">
      <EmptyView />
      {data?.bookmarks &&
        data.bookmarks.map((bookmark) => (
          <BookmarkListItem key={bookmark.id} bookmark={bookmark} onDelete={deleteItem} />
        ))}
    </List>
  );
}
