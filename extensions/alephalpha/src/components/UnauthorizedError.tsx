import { Detail, ActionPanel, Action, openExtensionPreferences } from "@raycast/api";

export function UnauthorizedError() {
  return (
    <Detail
      markdown="API key incorrect. Please update it in command preferences and try again."
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
