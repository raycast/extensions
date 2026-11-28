import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { isRejectedKey } from "../lib/http";

type LoadErrorViewProps = {
  title: string;
  error: Error;
  onRetry: () => void;
};

export function LoadFailedActions({ error, onRetry }: Omit<LoadErrorViewProps, "title">) {
  const retry = <Action key="retry" title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />;
  const preferences = (
    <Action key="preferences" title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
  );
  return <>{isRejectedKey(error) ? [preferences, retry] : [retry, preferences]}</>;
}

export const loadErrorHint = (error: Error): string =>
  isRejectedKey(error)
    ? "Press Enter to change your API key in the extension preferences."
    : "Retry, or check your API key in the extension preferences.";

export function LoadErrorView({ title, error, onRetry }: LoadErrorViewProps) {
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title={title}
      description={`${error.message}\n\n${loadErrorHint(error)}`}
      actions={
        <ActionPanel>
          <LoadFailedActions error={error} onRetry={onRetry} />
        </ActionPanel>
      }
    />
  );
}
