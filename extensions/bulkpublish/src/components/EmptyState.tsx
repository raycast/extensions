import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { ApiError } from "../lib/api";
import { API_KEYS_URL } from "../lib/core";

/** What a list shows when loading failed, with the action most likely to fix it. */
export function EmptyState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const badKey = error instanceof ApiError && error.status === 401;
  return (
    <List.EmptyView
      icon={badKey ? Icon.Key : Icon.ExclamationMark}
      title={badKey ? "Check Your API Key" : "Couldn't Load From BulkPublish"}
      description={error.message}
      actions={
        <ActionPanel>
          {badKey ? (
            <>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action.OpenInBrowser title="Get an API Key" url={API_KEYS_URL} />
            </>
          ) : (
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
          )}
        </ActionPanel>
      }
    />
  );
}
