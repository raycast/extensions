import { Action, ActionPanel, Detail, openExtensionPreferences } from "@raycast/api";

export default function AuthPrompt() {
  return (
    <Detail
      markdown={`
# You need to auth to use this extension

Please enter your API Key and Controller URL in the extension settings to authenticate.
`}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
