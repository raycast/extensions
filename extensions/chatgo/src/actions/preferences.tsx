import { Action, ActionPanel, Icon, openExtensionPreferences } from "@raycast/api";

export const PreferencesActionSection = () => {
  return (
    <ActionPanel.Section title="Preferences">
      <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences}></Action>
    </ActionPanel.Section>
  );
};
