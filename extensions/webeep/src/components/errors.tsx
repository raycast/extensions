import { Action, ActionPanel, Icon, List, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { AuthError } from "../lib/auth";

export async function showError(error: unknown, title = "WeBeep request failed"): Promise<void> {
  if (error instanceof AuthError) {
    await showToast({
      style: Toast.Style.Failure,
      title: "WeBeep login required",
      message: error.message,
      primaryAction: { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() },
    });
    return;
  }
  await showFailureToast(error, { title });
}

/** Empty state shown when the session cookie is missing, expired or rejected. */
export function AuthEmptyView({ error }: { error: Error }) {
  return (
    <List.EmptyView
      icon={Icon.Lock}
      title="WeBeep login required"
      description={error.message}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.OpenInBrowser title="Open WeBeep Login" url="https://webeep.polimi.it/login/index.php" />
        </ActionPanel>
      }
    />
  );
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

/** Warns that some courses failed to load while still showing the ones that succeeded. */
export async function showPartialFailure(errors: unknown[], what = "courses"): Promise<void> {
  const first = errors[0];
  await showToast({
    style: Toast.Style.Failure,
    title: `${errors.length} ${what} could not be loaded`,
    message: first instanceof Error ? first.message : undefined,
  });
}
