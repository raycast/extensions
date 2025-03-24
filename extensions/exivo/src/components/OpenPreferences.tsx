import { Action, ActionPanel, Detail, openExtensionPreferences } from "@raycast/api";

export const OpenPreferences = () => {
  const markdown =
    "## Configuration incomplete\nSystem ID, Client ID or Client Secret is missing. Please add your exivo credentials in the extension preferences.";

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
};
