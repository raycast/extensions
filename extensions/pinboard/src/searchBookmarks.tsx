import { List } from "@raycast/api";
import { useSearchBookmarks } from "./api";
import { BookmarkListItem } from "./components";

export default function Command() {
  const { bookmarks, isLoading } = useSearchBookmarks();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search by tags..." throttle>
      {bookmarks && bookmarks.map((bookmark) => <BookmarkListItem key={bookmark.id} bookmark={bookmark} />)}
    </List>
  );
}
