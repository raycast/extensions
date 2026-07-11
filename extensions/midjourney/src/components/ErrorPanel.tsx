import { Action, ActionPanel, Detail, openExtensionPreferences } from "@raycast/api";

export function ErrorPanel() {
  return (
    <Detail
      markdown={
        "## Something went wrong. \nCould not connect to Discord. Please check your extension settings and try again. \n[Setup instructions](https://github.com/CarterMcAlister/midjourney-raycast#how-to-use)"
      }
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
