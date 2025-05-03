import { MenuBarExtra, Icon, launchCommand, LaunchType } from "@raycast/api";

export default function Command() {
  return (
    <MenuBarExtra icon={Icon.Shield} tooltip="Checksum Tools">
      <MenuBarExtra.Item
        title="Checksum of a file"
        onAction={async () => {
          try {
            await launchCommand({ name: "checksum", type: LaunchType.UserInitiated });
          } catch (error) {
            console.error(error);
          }
        }}
      />
      <MenuBarExtra.Item
        title="Get Hash of Text"
        onAction={async () => {
          try {
            await launchCommand({ name: "hashtext", type: LaunchType.UserInitiated });
          } catch (error) {
            console.error(error);
          }
        }}
      />
      <MenuBarExtra.Item
        title="Get Hash of File"
        onAction={async () => {
          try {
            await launchCommand({ name: "hashfile", type: LaunchType.UserInitiated });
          } catch (error) {
            console.error(error);
          }
        }}
      />
    </MenuBarExtra>
  );
}
