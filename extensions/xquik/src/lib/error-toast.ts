import { open, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { SITE_URL } from "./api";
import { describeError, ErrorFix } from "./errors";

export function showErrorToast(error: Error, onRetry: () => void): Promise<Toast> {
  const { title, hint, fix } = describeError(error);
  const fixes: Record<ErrorFix, Toast.ActionOptions> = {
    preferences: { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() },
    site: { title: "Open Xquik", onAction: () => open(SITE_URL) },
    retry: {
      title: "Retry",
      onAction: (toast) => {
        toast.hide();
        onRetry();
      },
    },
  };
  return showToast({ style: Toast.Style.Failure, title, message: hint, primaryAction: fixes[fix] });
}
