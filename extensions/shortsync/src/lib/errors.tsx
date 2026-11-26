import { Action, ActionPanel, Icon, List, open, openExtensionPreferences, showToast, Toast } from "@raycast/api";

import { APP_LINKS, ShortSyncError, isAuthError } from "./api";

export const API_KEY_HINT = "Create a workspace API key in ShortSync under Settings, API, MCP & webhooks.";

/** A short, friendly title and message for any error the API client throws. */
export function describeError(error: unknown): { title: string; message: string } {
  if (!(error instanceof ShortSyncError)) {
    return { title: "Something went wrong", message: error instanceof Error ? error.message : String(error) };
  }
  if (error.code === "WORKSPACE_HEADER_REQUIRED") {
    return {
      title: "Use a workspace API key",
      message: `This extension needs a workspace key (ss_live_...), not an organization key. ${API_KEY_HINT}`,
    };
  }
  if (error.status === 401) {
    return {
      title: "Your ShortSync API key isn't working",
      message: `Check the key in the extension preferences. ${API_KEY_HINT}`,
    };
  }
  if (error.status === 403 && error.code === "INSUFFICIENT_SCOPE") {
    return { title: "This API key can't do that", message: error.message };
  }
  if (error.status === 429) {
    if (error.code === "QUOTA_EXCEEDED") {
      return { title: "Monthly API limit reached", message: "Your plan's API requests for this month are used up." };
    }
    if (error.code === "UPLOAD_QUOTA_EXCEEDED") {
      return { title: "Monthly upload limit reached", message: error.message };
    }
    if (error.code === "DAILY_LIMIT_REACHED") {
      return { title: "Daily posting limit reached", message: error.message };
    }
    const wait = error.retryAfterSeconds ? ` in ${error.retryAfterSeconds} seconds` : " in a minute";
    return { title: "Slow down a little", message: `ShortSync got a lot of requests from this key. Try again${wait}.` };
  }
  if (error.status >= 500) {
    return { title: "ShortSync had a problem", message: "Try again in a moment." };
  }
  return { title: "ShortSync couldn't do that", message: error.message };
}

function upgradeUrl(error: unknown): string | undefined {
  if (!(error instanceof ShortSyncError)) return undefined;
  const url = error.details?.upgrade_url;
  return typeof url === "string" ? url : undefined;
}

/** Shows (or updates) a failure toast with a fitting action. */
export async function showErrorToast(error: unknown, toast?: Toast): Promise<void> {
  const { title, message } = describeError(error);
  const target = toast ?? (await showToast({ style: Toast.Style.Failure, title }));
  target.style = Toast.Style.Failure;
  target.title = title;
  target.message = message;

  const upgrade = upgradeUrl(error);
  if (isAuthError(error)) {
    target.primaryAction = {
      title: "Open Extension Preferences",
      onAction: () => openExtensionPreferences(),
    };
  } else if (upgrade) {
    target.primaryAction = {
      title: "See Plans",
      onAction: () => open(upgrade),
    };
  }
}

/** Empty state for a List when loading failed. */
export function ErrorEmptyView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { title, message } = describeError(error);
  const auth = isAuthError(error);
  return (
    <List.EmptyView
      icon={auth ? Icon.Key : Icon.Warning}
      title={title}
      description={message}
      actions={
        <ActionPanel>
          {auth ? (
            <>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action.OpenInBrowser title="Get an API Key" url={APP_LINKS.apiSettings()} />
            </>
          ) : (
            <>
              {onRetry && <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />}
              <Action.OpenInBrowser title="Open ShortSync" url={APP_LINKS.dashboard()} />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
