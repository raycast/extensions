import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
  openExtensionPreferences,
  popToRoot,
} from "@raycast/api";
import { useSearchConstantsBookmarks } from "./api";
import { BookmarkListItem, EmptyView } from "./components";

export default function Command() {
  const { isLoading, data } = useSearchConstantsBookmarks();
  const { constantTags } = getPreferenceValues();

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
      {data?.bookmarks && data.bookmarks.map((bookmark) => <BookmarkListItem key={bookmark.id} bookmark={bookmark} />)}
    </List>
  );
}
