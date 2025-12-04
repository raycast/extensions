import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

export default function InvalidUrl() {
  return (
    <Detail
      markdown={`# ERROR \n\n Please make sure cPanel URL is Valid!`}
      actions={
        <ActionPanel>
          <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
