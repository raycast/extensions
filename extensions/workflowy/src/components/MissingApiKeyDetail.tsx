import { Action, ActionPanel, Detail, openExtensionPreferences } from "@raycast/api";

export function MissingApiKeyDetail() {
  return (
    <Detail
      markdown={[
        "# Workflowy API Key Required",
        "",
        "Add your Workflowy API key in extension preferences to use this command.",
        "",
        "You can get one from the [Workflowy API Key page](https://workflowy.com/api-key/).",
      ].join("\n")}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          <Action.OpenInBrowser title="Open Workflowy API Key Page" url="https://workflowy.com/api-key/" />
        </ActionPanel>
      }
    />
  );
}
