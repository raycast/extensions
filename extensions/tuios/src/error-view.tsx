import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";

/** Shown in place of an empty list when the first load failed, so a stopped daemon doesn't look like "nothing here". */
export function ErrorView({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title="tuios is not answering"
      description={error.message}
      actions={
        <ActionPanel>
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={retry} />
          <Action title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
