import { List } from "@raycast/api";
import { useBookmark } from "./hooks/useBookmarks";
import StatusItem from "./components/StatusItem";

export default function BookmarkCommand() {
  const { bookmarks, isLoading } = useBookmark();

  return (
    <List isShowingDetail isLoading={isLoading} searchBarPlaceholder="Search bookmarks">
      {bookmarks?.map((bookmark) => (
        <StatusItem key={bookmark.id} status={bookmark.reblog ? bookmark.reblog : bookmark} />
      ))}
    </List>
  );
}
