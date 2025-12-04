import { Action, ActionPanel, Icon, openCommandPreferences } from "@raycast/api";

export function ActionSettings() {
  return (
    <ActionPanel.Section>
      <Action
        icon={Icon.Gear}
        title="Configure Command"
        shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
        onAction={openCommandPreferences}
      />
    </ActionPanel.Section>
  );
}
