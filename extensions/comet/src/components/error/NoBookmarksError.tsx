import { List } from "@raycast/api";
import CometProfileDropDown from "../CometProfileDropdown";

export function NoBookmarksError({ onProfileSelected }: { onProfileSelected?: (profileId: string) => void }) {
  return (
    <List searchBarAccessory={<CometProfileDropDown onProfileSelected={onProfileSelected} />}>
      <List.EmptyView
        icon="📂"
        title="No bookmarks found"
        description="This profile doesn't have any bookmarks yet. You can add some bookmarks in Comet browser or select a different profile."
      />
    </List>
  );
}
