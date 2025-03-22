import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences, open } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.EmptyView
        icon={{ source: Icon.Warning, tintColor: Color.SecondaryText }}
        title="Deprecated extension"
        description="This extension is now included in the Threads extension. You can use Threads to access its previous functionality. If you wish, you can uninstall this extension from Preferences."
        actions={
          <ActionPanel>
            <Action
              title="Open Threads Extension"
              onAction={() => open("raycast://extensions/chrismessina/threads")}
              icon={Icon.ArrowRight}
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
