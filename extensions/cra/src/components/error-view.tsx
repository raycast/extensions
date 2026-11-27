import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";

/** Shown instead of the "Nothing found" view when loading data failed, with a way to retry. */
export function ErrorEmptyView(props: { title: string; error: Error; onRetry?: () => void }) {
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title={props.title}
      description={props.error.message}
      actions={
        <ActionPanel>
          {props.onRetry && <Action title="Retry" icon={Icon.ArrowClockwise} onAction={props.onRetry} />}
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
