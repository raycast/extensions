import { Detail, ActionPanel, Action, openExtensionPreferences } from "@raycast/api";

export default function ApiKeyMissing() {
  const markdown = "Toggl API key is not set. Please set it in extension preferences and try again.";

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
