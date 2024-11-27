import { Icon, MenuBarExtra, openExtensionPreferences } from "@raycast/api";
import { launchCommand, LaunchType } from "@raycast/api";

export default function MenuBarMove() {
  return (
    <MenuBarExtra icon={Icon.ChevronUpDown} tooltip="Move desk">
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Stand Up"
          icon={Icon.ChevronUp}
          onAction={async () => {
            try {
              launchCommand({ name: "move-to-stand", type: LaunchType.UserInitiated });
            } catch (e) {
              () => {};
            }
          }}
          shortcut={{ modifiers: ["cmd"], key: "1" }}
        />
        <MenuBarExtra.Item
          title="Sit Down"
          icon={Icon.ChevronDown}
          onAction={async () => {
            try {
              launchCommand({ name: "move-to-sit", type: LaunchType.UserInitiated });
            } catch (e) {
              () => {};
            }
          }}
          shortcut={{ modifiers: ["cmd"], key: "2" }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Configure Extension"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openExtensionPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
