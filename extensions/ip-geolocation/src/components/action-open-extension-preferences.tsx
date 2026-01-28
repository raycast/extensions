import { Action, Icon, openExtensionPreferences } from "@raycast/api";

export function ActionOpenExtensionPreferences() {
  return (
    <Action
      icon={Icon.Gear}
      title="Configure Extension"
      shortcut={{ modifiers: ["shift", "cmd"], key: "." }}
      onAction={openExtensionPreferences}
    />
  );
}
