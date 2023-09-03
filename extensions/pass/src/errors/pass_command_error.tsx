import { ActionPanel, Action, Detail, openExtensionPreferences } from "@raycast/api";

export default function PassCommandError(commands_used: string[]) {
  const markdown = `Could not run successfully pass command, ensure that ${commands_used} are installed and set in 'path_var' property. Please update it in extension preferences and try again.`;

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