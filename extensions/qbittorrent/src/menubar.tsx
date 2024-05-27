import { MenuBarExtra, Icon, Keyboard, openExtensionPreferences, launchCommand, LaunchType } from "@raycast/api";

export default function Menubar() {
  const showTorrents = () => launchCommand({ name: "torrents", type: LaunchType.UserInitiated });

  const handleAddTorrent = () => launchCommand({ name: "add-torrents", type: LaunchType.UserInitiated });

  return (
    <MenuBarExtra icon={{ source: "menubar.svg" }}>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="All Torrents"
          icon={Icon.Shuffle}
          shortcut={{ modifiers: ["cmd"], key: "a" }}
          onAction={showTorrents}
        />
        <MenuBarExtra.Item
          title="Add Torrent"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={handleAddTorrent}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Configure Command"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openExtensionPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
