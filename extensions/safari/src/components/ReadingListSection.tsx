import { List } from "@raycast/api";
import _ from "lodash";
import BookmarkListItem from "./BookmarkListItem";
import { ReadingListBookmark } from "../types";
import { plural } from "../utils";

const ReadingListSection = (props: { title: string; filteredBookmarks: ReadingListBookmark[] }) => (
  <List.Section title={_.startCase(props.title)} subtitle={plural(props.filteredBookmarks.length, "bookmark")}>
    {props.filteredBookmarks.map((bookmark) => (
      <BookmarkListItem key={bookmark.uuid} bookmark={bookmark} />
    ))}
  </List.Section>
);

export default ReadingListSection;
