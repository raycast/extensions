import { List } from "@raycast/api";
import Bookmark from "../dtos/bookmark-dto";
import BookmarkListItem from "./bookmark-list-item";

export default function BookmarkList(props: { bookmarks: Bookmark[] }) {
  return (
    <List searchBarPlaceholder="Filter bookmarks by name...">
      {props.bookmarks.map((bookmark) => (
        <BookmarkListItem key={bookmark.RepositoryIdentifier} bookmark={bookmark} />
      ))}
    </List>
  );
}
