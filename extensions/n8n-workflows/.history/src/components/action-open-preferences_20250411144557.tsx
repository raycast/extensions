import { Action, ActionPanel, Icon, openCommandPreferences } from "@raycast/api";

export function ActionOpenPreferences() {
  return (
    <ActionPanel.Section>
      <Action icon={Icon.Gear} title={"Open Command Preferences"} onAction={openCommandPreferences} />
    </ActionPanel.Section>
  );
}
