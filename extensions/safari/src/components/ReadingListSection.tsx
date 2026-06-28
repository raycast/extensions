import { List } from "@raycast/api";
import _ from "lodash";
import { ReadingListBookmark } from "../types";
import { plural } from "../utils";
import BookmarkListItem from "./BookmarkListItem";

export default function ReadingListSection(props: { title: string; filteredBookmarks: ReadingListBookmark[] }) {
  return (
    <List.Section title={_.startCase(props.title)} subtitle={plural(props.filteredBookmarks.length, "bookmark")}>
      {props.filteredBookmarks.map((bookmark) => (
        <BookmarkListItem key={bookmark.uuid} bookmark={bookmark} />
      ))}
    </List.Section>
  );
}
