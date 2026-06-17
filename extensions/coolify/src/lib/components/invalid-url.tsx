import { Detail, ActionPanel, Action, Icon, openExtensionPreferences } from "@raycast/api";

export default function InvalidUrl() {
  return (
    <Detail
      markdown={`# ERROR \n\n Please make sure Coolify URL is valid`}
      actions={
        <ActionPanel>
          <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
