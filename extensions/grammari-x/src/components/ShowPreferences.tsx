import { ActionPanel, Action, Detail, openExtensionPreferences } from "@raycast/api";

export default function ShowPreferences() {
  const markdown = "OpenAI API key incorrect. Please update it in extension preferences and try again.";

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
