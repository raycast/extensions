import { Action, ActionPanel, List, open, Icon } from "@raycast/api";

export default function Update() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Info}
        title="Update the Spotify Player Extension"
        description="Thanks for helping test Spotify Player Beta. This version of this extension is no longer supported, please update to the latest version."
        actions={
          <ActionPanel>
            <Action
              title="Install Spotify Player"
              onAction={() => open("raycast://extensions/mattisssa/spotify-player")}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
