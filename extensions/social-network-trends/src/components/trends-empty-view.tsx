import { ActionPanel, Icon, List } from "@raycast/api";
import { PreferenceActions } from "./preference-actions";

export function TrendsEmptyView() {
  return (
    <List.EmptyView
      icon={Icon.Hashtag}
      title={"No Trends"}
      actions={
        <ActionPanel>
          <PreferenceActions />
        </ActionPanel>
      }
    />
  );
}
