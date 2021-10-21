import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction } from "@raycast/api";
import { Bookmark, useSearchBookmarks } from "./api";

export default function Command() {
  const { state, search } = useSearchBookmarks();

  return (
    <List isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Search by tags..." throttle>
      {state.bookmarks.map((bookmark) => (
        <BookmarkListItem key={bookmark.id} bookmark={bookmark} />
      ))}
    </List>
  );
}

function BookmarkListItem(props: { bookmark: Bookmark }) {
  const bookmark = props.bookmark;

  return (
    <List.Item
      id={bookmark.id}
      title={bookmark.title}
      icon="list-icon.png"
      accessoryTitle={bookmark.tags}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={bookmark.url} />
          <CopyToClipboardAction title="Copy URL" content={bookmark.url} />
        </ActionPanel>
      }
    />
  );
}
