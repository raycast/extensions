import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences } from "@raycast/api";

interface Props {
  title: string;
  error: Error;
  onRetry: () => void;
}

/** Shown in place of the empty state when a list's data failed to load. */
export function ErrorView({ title, error, onRetry }: Props) {
  return (
    <List.EmptyView
      icon={{ source: Icon.Warning, tintColor: Color.Red }}
      title={title}
      description={error.message}
      actions={
        <ActionPanel>
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
