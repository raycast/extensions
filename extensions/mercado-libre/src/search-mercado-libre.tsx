import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.EmptyView
        icon={{ source: Icon.Warning, tintColor: Color.SecondaryText }}
        title="Deprecated Extension"
        description="The API used in this extension is no longer available.
You can uninstall from Preferences."
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
