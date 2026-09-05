import { open, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { ApiError } from "../api/client";

export const UPGRADE_URL = "https://timist.app/upgrade/plus";

// Central error mapping for interactive commands (menu bar has its own,
// toast-free handling). Server messages are shown verbatim where the spec
// says so — the API contract keeps them concise and human-readable.
export async function showApiErrorToast(
  error: unknown,
  options: { refetch?: () => Promise<unknown> } = {},
): Promise<void> {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid API key",
          primaryAction: {
            title: "Open Extension Preferences",
            onAction: () => {
              void openExtensionPreferences();
            },
          },
        });
        return;
      case 403:
        await showToast({
          style: Toast.Style.Failure,
          title: error.message,
          primaryAction: {
            title: "Upgrade",
            onAction: () => {
              void open(UPGRADE_URL);
            },
          },
        });
        return;
      case 404:
        await options.refetch?.();
        await showToast({ style: Toast.Style.Failure, title: "Not found — refreshed" });
        return;
      case 409:
        await options.refetch?.();
        await showToast({ style: Toast.Style.Success, title: error.message });
        return;
      case 400:
      case 422:
        await showToast({ style: Toast.Style.Failure, title: error.message });
        return;
      case 429:
        await showToast({ style: Toast.Style.Failure, title: "Rate limited, try again" });
        return;
      default:
        await showToast({ style: Toast.Style.Failure, title: "Timist error, try again" });
        return;
    }
  }
  await showToast({ style: Toast.Style.Failure, title: "Can't reach Timist" });
}

// One retry after Retry-After on 429, per spec. Anything else propagates.
export async function withRateLimitRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      await showToast({ style: Toast.Style.Animated, title: "Rate limited, retrying…" });
      const delaySeconds = Math.min(error.retryAfterSeconds ?? 2, 15);
      await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
      return await operation();
    }
    throw error;
  }
}
