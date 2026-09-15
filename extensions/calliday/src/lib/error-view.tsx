import { Action, ActionPanel, Icon, List, open, openExtensionPreferences } from "@raycast/api";

export function CallidayErrorView({ error }: { error: Error }) {
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title="Couldn't Reach Calliday"
      description={error.message}
      actions={
        <ActionPanel>
          <Action title="Open Calliday" icon={Icon.AppWindow} onAction={() => open("calliday://")} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
