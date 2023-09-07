import { List } from "@raycast/api";
import useBookmarks from "./hooks/useBookmarks";
import BookmarkListItem from "./components/BookmarkListItem";

export default function Command() {
  const { bookmarks, isLoading } = useBookmarks();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search by title, domain name, or folder">
      {bookmarks.map((bookmark) => (
        <BookmarkListItem key={bookmark.uuid} bookmark={bookmark} />
      ))}
    </List>
  );
}
