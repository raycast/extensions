import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";

export function ConfigErrorView({ error }: { error: Error }) {
  return (
    <List searchBarPlaceholder="Mealie">
      <List.EmptyView
        icon={Icon.Gear}
        title="Mealie is not configured yet"
        description={error.message}
        actions={
          <ActionPanel>
            <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}
