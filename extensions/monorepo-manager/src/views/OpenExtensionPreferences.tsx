import { ActionPanel, Action, Detail, openCommandPreferences } from '@raycast/api';

/**
 * A view shows when we cannot read preferences and remind users to go to the extension preferences.
 */
export function OpenExtensionPreferences() {
  const markdown = `'Workspace root paths is incorrect.
    Workspace root paths is a string.
    Each path is separated by a comma.
    Please update it in command preferences and try again.'`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openCommandPreferences} />
        </ActionPanel>
      }
    />
  );
}
