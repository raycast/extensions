import { List } from "@raycast/api";
import _ from "lodash";
import { GeneralBookmark } from "../types";
import { plural } from "../utils";
import BookmarkListItem from "./BookmarkListItem";

export default function BookmarkListSection(props: { title: string; filteredBookmarks: GeneralBookmark[] }) {
  return (
    <List.Section title={_.startCase(props.title)} subtitle={plural(props.filteredBookmarks.length, "bookmark")}>
      {props.filteredBookmarks.map((bookmark) => (
        <BookmarkListItem key={bookmark.uuid} bookmark={bookmark} />
      ))}
    </List.Section>
  );
}
