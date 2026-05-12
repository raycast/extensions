import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

type Props = {
  title: string;
  message: string;
};

export function ConfigurationRequired({ title, message }: Props) {
  return (
    <Detail
      markdown={`# ${title}\n\n${message}\n\nOpen Extension Preferences to configure Prompt Launcher.`}
      actions={
        <ActionPanel>
          <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
