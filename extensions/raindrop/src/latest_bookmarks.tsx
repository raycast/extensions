import { List, showToast, ToastStyle } from "@raycast/api";
import BookmarkItem from "./components/BookmarkItem";
import { useLatestBookmarks } from "./utils";
import { Bookmark } from "./types";

export default function LatestBookmarks() {
  const { response, error, isLoading } = useLatestBookmarks();

  if (error) {
    showToast(ToastStyle.Failure, "Cannot search bookmark", error);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter bookmarks by title...">
      {response?.items?.map((bookmark: Bookmark) => (
        <BookmarkItem key={bookmark._id} bookmark={bookmark} />
      ))}
    </List>
  );
}
