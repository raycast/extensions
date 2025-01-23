import { Action, Icon, openCommandPreferences } from "@raycast/api";

export function ActionOpenCommandPreferences() {
  return (
    <Action
      icon={Icon.Gear}
      title="Configure Command"
      shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
      onAction={openCommandPreferences}
    />
  );
}
