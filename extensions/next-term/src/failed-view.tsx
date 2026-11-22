import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";

/** A list's failure: what Next Term said, with Retry and the nxtrm path preference to fix it. */
export function FailedView(props: { error: Error; retry: () => void }) {
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title="Next Term didn't answer"
      description={props.error.message}
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={props.retry} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
