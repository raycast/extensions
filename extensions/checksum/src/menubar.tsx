import { MenuBarExtra, Icon, launchCommand, LaunchType } from "@raycast/api";

export default function Command() {
  return (
    <MenuBarExtra icon={Icon.Shield} tooltip="Your Pull Requests">
      <MenuBarExtra.Item
        title="Checksum of a file"
        onAction={() => {
          launchCommand({ name: "checksum", type: LaunchType.UserInitiated });
        }}
      />
      <MenuBarExtra.Item
        title="Get Hash of Text"
        onAction={() => {
          launchCommand({ name: "hashtext", type: LaunchType.UserInitiated });
        }}
      />
      <MenuBarExtra.Item
        title="Get Hash Of File"
        onAction={() => {
          launchCommand({ name: "hash", type: LaunchType.UserInitiated });
        }}
      />
    </MenuBarExtra>
  );
}
