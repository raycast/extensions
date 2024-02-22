import { ActionPanel, List } from "@raycast/api";
import { PreferenceActions } from "./preference-actions";

export function TrendsEmptyView() {
  return (
    <List.EmptyView
      icon={"extension-icon/empty-view-icon.png"}
      title={"No Trend"}
      actions={
        <ActionPanel>
          <PreferenceActions />
        </ActionPanel>
      }
    />
  );
}
