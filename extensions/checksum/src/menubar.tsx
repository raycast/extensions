import { MenuBarExtra, Icon, launchCommand, LaunchType } from "@raycast/api";

export default function Command() {
  return (
    <MenuBarExtra icon={Icon.Shield} tooltip="Checksum Tools">
      <MenuBarExtra.Item
        title="Verify File Checksum"
        icon={Icon.CheckCircle}
        onAction={async () => {
          try {
            await launchCommand({ name: "checksum", type: LaunchType.UserInitiated });
          } catch (error) {
            console.error(error);
          }
        }}
      />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Calculate File Hash"
        icon={Icon.Document}
        onAction={async () => {
          try {
            await launchCommand({ name: "hashfile", type: LaunchType.UserInitiated });
          } catch (error) {
            console.error(error);
          }
        }}
      />
      <MenuBarExtra.Item
        title="Calculate Text Hash"
        icon={Icon.Text}
        onAction={async () => {
          try {
            await launchCommand({ name: "hashtext", type: LaunchType.UserInitiated });
          } catch (error) {
            console.error(error);
          }
        }}
      />
    </MenuBarExtra>
  );
}
