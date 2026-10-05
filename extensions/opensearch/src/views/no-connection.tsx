import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

export function NoConnection() {
  const markdown = [
    "# No connection configured",
    "",
    "Add an OpenSearch cluster with the **Manage Connections** command,",
    "or fill in the extension preferences for a single fallback connection.",
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
