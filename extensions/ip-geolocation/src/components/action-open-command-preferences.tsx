import { Action, ActionPanel, Icon, openCommandPreferences } from "@raycast/api";

export function ActionOpenCommandPreferences() {
  return (
    <ActionPanel.Section>
      <Action
        icon={Icon.Gear}
        title="Open Extension Preferences"
        shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
        onAction={openCommandPreferences}
      />
    </ActionPanel.Section>
  );
}
