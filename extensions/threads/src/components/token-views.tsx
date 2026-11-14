/**
 * The "this command needs an access token" surfaces, shared by Analytics and
 * Giveaway. Both commands hit the same three states — no token, a load that failed
 * with nothing cached, and a load that failed while cached data is still on screen —
 * and each state's copy and actions have to match the toast the user just saw.
 */
import { Action, ActionPanel, Color, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import { getErrorMessage } from "@chrismessina/raycast-kit";
import {
  MISSING_TOKEN_MESSAGE,
  MISSING_TOKEN_TITLE,
  TOKEN_HELP_URL,
  describeApiError,
  isTokenExpired,
} from "../lib/threads-auth";

export function TokenActions({
  error,
  onRefresh,
  refreshFirst = false,
}: {
  error?: unknown;
  onRefresh?: () => void;
  /** Lead with Refresh when the fix is to retry rather than to change the token. */
  refreshFirst?: boolean;
}) {
  const openPreferences = (
    <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
  );
  return (
    <ActionPanel>
      {refreshFirst ? null : openPreferences}
      {onRefresh ? (
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onRefresh}
        />
      ) : null}
      {refreshFirst ? openPreferences : null}
      <Action.OpenInBrowser title="How to Get an Access Token" url={TOKEN_HELP_URL} />
      {error ? (
        <Action.CopyToClipboard
          title="Copy Error"
          content={getErrorMessage(error)}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      ) : null}
    </ActionPanel>
  );
}

/** Whole-command view for a command launched with no token configured. */
export function MissingTokenView() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Key}
        title={MISSING_TOKEN_TITLE}
        description={MISSING_TOKEN_MESSAGE}
        actions={<TokenActions />}
      />
    </List>
  );
}

/** Failed load with nothing cached to fall back on. */
export function ApiErrorView({
  error,
  fallbackTitle,
  onRefresh,
}: {
  error: unknown;
  fallbackTitle: string;
  onRefresh: () => void;
}) {
  const { title, message, fixInPreferences } = describeApiError(error, fallbackTitle);
  return (
    <List.EmptyView
      icon={isTokenExpired(error) ? Icon.Key : Icon.ExclamationMark}
      title={title}
      description={message}
      actions={<TokenActions error={error} onRefresh={onRefresh} refreshFirst={!fixInPreferences} />}
    />
  );
}

/**
 * Failed refresh with cached data still showing. Without this the list renders
 * yesterday's numbers as if they were current — `useCachedPromise` keeps returning
 * cached data after a failed revalidation, so an error-only-when-empty check never
 * fires again once anything has been cached.
 */
export function StaleDataSection({
  error,
  fallbackTitle,
  onRefresh,
}: {
  error: unknown;
  fallbackTitle: string;
  onRefresh: () => void;
}) {
  const { title, message, fixInPreferences } = describeApiError(error, fallbackTitle);
  return (
    <List.Section title="Couldn't Refresh">
      <List.Item
        icon={{ source: Icon.Warning, tintColor: Color.Orange }}
        title={title}
        subtitle={message}
        accessories={[{ text: "Showing last loaded data" }]}
        actions={<TokenActions error={error} onRefresh={onRefresh} refreshFirst={!fixInPreferences} />}
      />
    </List.Section>
  );
}
