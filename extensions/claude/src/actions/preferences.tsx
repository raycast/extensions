import { Action, ActionPanel, Icon, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { API_KEY_CONSOLE_URL } from "../constants";

export const PreferencesActionSection = () => {
  // Read at render, not in a mount-time initializer, so this reflects a key added while a
  // view is already open (the same staleness class fixed in `useAnthropic`/`useChat`).
  const { apiKey } = getPreferenceValues<Preferences>();

  return (
    <ActionPanel.Section title="Preferences">
      <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
      {/* Only useful to someone who does not have a key yet — once one is set this is dead
          clutter in every action panel in the extension. `apiKey` is a required preference,
          so an empty/whitespace value is the only "not configured" state to test for. */}
      {!apiKey?.trim() && <Action.OpenInBrowser icon={Icon.Key} title="Get an API Key" url={API_KEY_CONSOLE_URL} />}
    </ActionPanel.Section>
  );
};
