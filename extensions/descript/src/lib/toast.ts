import { Toast, openExtensionPreferences, showToast } from "@raycast/api";

import { DescriptApiError, isInvalidTokenError, isMissingTokenError } from "./errors";

/**
 * Maps any error thrown by the Descript client into a consistent toast. When
 * the failure is caused by missing or invalid credentials we offer a direct
 * shortcut into extension preferences so the user can fix it in one keystroke.
 */
export async function showErrorToast(title: string, error: unknown): Promise<void> {
  if (error instanceof DescriptApiError) {
    const toast = await showToast({
      style: Toast.Style.Failure,
      title,
      message: error.friendlyMessage(),
    });
    if (error.status === 401) {
      toast.primaryAction = {
        title: "Open Preferences",
        onAction: async () => {
          await openExtensionPreferences();
        },
      };
    }
    return;
  }

  if (isMissingTokenError(error) || isInvalidTokenError(error)) {
    const toast = await showToast({
      style: Toast.Style.Failure,
      title: isMissingTokenError(error) ? "Missing Descript API Token" : "Invalid Descript API Token",
      message: error instanceof Error ? error.message : "Update your token in extension preferences.",
    });
    toast.primaryAction = {
      title: "Open Preferences",
      onAction: async () => {
        await openExtensionPreferences();
      },
    };
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  await showToast({ style: Toast.Style.Failure, title, message });
}
