import { List } from "@raycast/api";
import { useSearchBookmarks } from "./api";
import { BookmarkListItem, EmptyView } from "./components";

export default function Command() {
  const { data, isLoading } = useSearchBookmarks();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search by name or #tag...">
      <EmptyView />
      {data?.bookmarks && data.bookmarks.map((bookmark) => <BookmarkListItem key={bookmark.id} bookmark={bookmark} />)}
    </List>
  );
}
