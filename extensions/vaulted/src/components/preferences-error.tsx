import {
  Action,
  ActionPanel,
  Detail,
  openExtensionPreferences,
} from "@raycast/api";

export function PreferencesErrorView({ message }: { message: string }) {
  const markdown = [
    "## Invalid configuration",
    "",
    message,
    "",
    "Open extension preferences to fix the **Host** setting, then run the command again.",
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Open Extension Preferences"
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
