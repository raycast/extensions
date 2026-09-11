import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";

export default function LanguageConfigError({ message }: { message: string }) {
  return (
    <List>
      <List.EmptyView
        title="Invalid Language Configuration"
        description={message}
        icon={Icon.ExclamationMark}
        actions={
          <ActionPanel>
            <Action title="Open Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
          </ActionPanel>
        }
      />
    </List>
  );
}
