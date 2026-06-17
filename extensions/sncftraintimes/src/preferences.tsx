import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

export default function Preferences() {
  return (
    <Detail
      markdown="API key incorrect. Please update it in extension preferences and try again."
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
        </ActionPanel>
      }
    />
  );
}
