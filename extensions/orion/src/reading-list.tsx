import { List } from "@raycast/api";
import useReadingList from "./hooks/useReadingList";
import BookmarkListItem from "./components/BookmarkListItem";

export default function Command() {
  const { bookmarks } = useReadingList();

  return (
    <List isLoading={!bookmarks} searchBarPlaceholder="Search by title or domain name">
      {bookmarks?.map((bookmark) => (
        <BookmarkListItem key={bookmark.uuid} bookmark={bookmark} />
      ))}
    </List>
  );
}
