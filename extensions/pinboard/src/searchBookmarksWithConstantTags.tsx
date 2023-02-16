import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
  openExtensionPreferences,
  popToRoot,
} from "@raycast/api";
import { deleteBookmark, useSearchConstantsBookmarks } from "./api";
import { BookmarkListItem, EmptyView } from "./components";
import { Bookmark, BookmarksResponse } from "./types";

export default function Command() {
  const { isLoading, data, mutate } = useSearchConstantsBookmarks();
  const { constantTags } = getPreferenceValues();

  async function deleteItem(bookmark: Bookmark) {
    try {
      await mutate(deleteBookmark(bookmark), {
        optimisticUpdate(data?: BookmarksResponse) {
          if (data) {
            return {
              ...data,
              bookmarks: data.bookmarks.filter((bookmarkItem) => bookmarkItem.url !== bookmark.url),
            };
          }
        },
      });
    } catch (error) {
      console.error("deleteItem error", error);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search by name...">
      <EmptyView
        title={!constantTags ? "No Constant Tags Added" : undefined}
        description={!constantTags ? "Press enter to add constant tags" : undefined}
        actions={
          !constantTags && (
            <ActionPanel>
              <Action
                onAction={() => {
                  openExtensionPreferences();
                  popToRoot();
                }}
                title="Add Constant Tags"
                icon={Icon.Gear}
              />
            </ActionPanel>
          )
        }
      />
      {data?.bookmarks &&
        data.bookmarks.map((bookmark) => (
          <BookmarkListItem key={bookmark.id} bookmark={bookmark} onDelete={deleteItem} />
        ))}
    </List>
  );
}
