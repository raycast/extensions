import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.EmptyView
        icon="tuple_noview.png"
        title="Deprecated extension"
        description="We are currently developing a new version; in the meantime, you may uninstall this extension in the preferences."
        actions={
          <ActionPanel>
            <Action
              onAction={openExtensionPreferences}
              title="Open Extension Preferences"
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
