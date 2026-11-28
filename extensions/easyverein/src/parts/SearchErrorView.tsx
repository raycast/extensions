import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { describeError } from "../errors";

interface SearchErrorViewProps {
  error: Error;
  onRetry: () => void;
}

export function SearchErrorView({ error, onRetry }: SearchErrorViewProps) {
  const { title, message } = describeError(error);
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title={title}
      description={message}
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
