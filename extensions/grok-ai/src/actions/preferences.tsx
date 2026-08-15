import { Action, ActionPanel, Icon, openExtensionPreferences } from "@raycast/api";

export const PreferencesActionSection = () => (
  <ActionPanel.Section title="Preferences">
    <Action icon={Icon.Gear} title="Open Grok Extension Preferences" onAction={openExtensionPreferences} />
  </ActionPanel.Section>
);
