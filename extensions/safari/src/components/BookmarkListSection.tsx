import { List } from "@raycast/api";
import _ from "lodash";
import BookmarkListItem from "./BookmarkListItem";
import { GeneralBookmark } from "../types";
import { plural } from "../utils";

const BookmarkListSection = (props: { title: string; filteredBookmarks: GeneralBookmark[] }) => (
  <List.Section title={_.startCase(props.title)} subtitle={plural(props.filteredBookmarks.length, "bookmark")}>
    {props.filteredBookmarks.map((bookmark) => (
      <BookmarkListItem key={bookmark.uuid} bookmark={bookmark} />
    ))}
  </List.Section>
);

export default BookmarkListSection;
