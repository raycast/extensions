import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences } from "@raycast/api";

function isAuthError(error: Error): boolean {
  return /api key|unauthor|401/i.test(error.message);
}

/**
 * Standard error state for list-based commands: surfaces the real API error (e.g. a bad API key or a
 * failed request) instead of a misleading empty state, with retry and a shortcut to preferences.
 */
export function ErrorView({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const auth = isAuthError(error);
  return (
    <List.EmptyView
      icon={{ source: Icon.Warning, tintColor: Color.Red }}
      title={auth ? "Check your API key" : "Something went wrong"}
      description={error.message}
      actions={
        <ActionPanel>
          {onRetry ? <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} /> : null}
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
