import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

export function InvalidCredentials({ message }: { message?: string }) {
  const markdown = "API key incorrect. Please update it in extension preferences and try again.";

  return (
    <Detail
      markdown={message ?? markdown}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
