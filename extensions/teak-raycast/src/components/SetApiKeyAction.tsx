import { Action, Icon, openExtensionPreferences } from "@raycast/api";

export function SetApiKeyAction() {
  return (
    <Action
      icon={Icon.Gear}
      onAction={openExtensionPreferences}
      shortcut={{ key: "k", modifiers: ["cmd", "shift"] }}
      title="Set API Key"
    />
  );
}
