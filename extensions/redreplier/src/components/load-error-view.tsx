import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";

type LoadErrorViewProps = {
  title: string;
  error: Error;
  onRetry: () => void;
};

export function LoadErrorView({ title, error, onRetry }: LoadErrorViewProps) {
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title={title}
      description={error.message}
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
