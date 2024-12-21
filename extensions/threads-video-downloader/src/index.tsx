import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences, LaunchType, open } from "@raycast/api";
import { crossLaunchCommand } from "raycast-cross-extension";

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
              onAction={() =>
                crossLaunchCommand({
                  name: "threads",
                  type: LaunchType.UserInitiated,
                  extensionName: "threads",
                  ownerOrAuthorName: "chrismessina",
                  context: {
                    foo: "foo",
                    bar: "bar",
                  },
                }).catch(() => {
                  open("raycast://extensions/chrismessina/threads");
                })
              }
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
