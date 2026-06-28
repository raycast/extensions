import { List } from "@raycast/api";
import { useSearchBookmarks, SearchKind } from "./api";
import { BookmarkListItem } from "./components";

export default function Command() {
  const { state, search } = useSearchBookmarks(SearchKind.Constant);

  return (
    <List isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Search by tags..." throttle>
      <List.Section title={state.title} subtitle={state.bookmarks.length + ""}>
        {state.bookmarks.map((bookmark) => (
          <BookmarkListItem key={bookmark.id} bookmark={bookmark} />
        ))}
      </List.Section>
    </List>
  );
}
