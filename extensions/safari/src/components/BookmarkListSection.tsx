import { List } from "@raycast/api";
import BookmarkListItem from "./BookmarkListItem";
import { ReadingListBookmark } from "../types";

const BookmarkListSection = (props: { filteredBookmarks: ReadingListBookmark[] }) => (
  <List.Section title="Bookmarks">
    {props.filteredBookmarks.map((bookmark) => (
      <BookmarkListItem key={bookmark.uuid} bookmark={bookmark} />
    ))}
  </List.Section>
);

export default BookmarkListSection;
