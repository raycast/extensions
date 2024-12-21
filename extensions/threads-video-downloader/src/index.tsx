import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.EmptyView
        icon={{ source: Icon.Warning, tintColor: Color.SecondaryText }}
        title="Deprecated extension"
        description="This extension is now part of the Threads extension. Install Threads to access its previous functionality. You can uninstall this extension from Preferences."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Install Threads Extension"
              url="https://www.raycast.com/chrismessina/threads"
              icon={Icon.Download}
            />
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
