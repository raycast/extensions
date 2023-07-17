import { List } from "@raycast/api";
import Bookmark from "../dtos/bookmark-dto";
import BookmarkListItem from "./bookmark-list-item";

export default function BookmarkList(props: { bookmarks: Bookmark[] | undefined; isLoading: boolean }) {
  return (
    <List searchBarPlaceholder="Filter bookmarks by name..." isLoading={props.isLoading}>
      <List.Section
        title={`${props.bookmarks?.length} ${props.bookmarks?.length === 1 ? "Repository" : "Repositories"}`}
      >
        {props.bookmarks?.map((bookmark) => (
          <BookmarkListItem key={bookmark.id} bookmark={bookmark} />
        ))}
      </List.Section>
    </List>
  );
}
