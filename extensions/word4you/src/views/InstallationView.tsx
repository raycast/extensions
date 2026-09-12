import { List, ActionPanel, Action, Icon, openExtensionPreferences } from "@raycast/api";

export function InstallationView() {
  return (
    <List isShowingDetail>
      <List.EmptyView
        title="Word4You CLI Not Found"
        icon={Icon.Warning}
        description="The Word4You CLI tool needs to be downloaded."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}
