import { useEffect } from "react";
import { showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { ApiError } from "../api";

/**
 * Hook to handle authentication errors consistently across all commands.
 * Shows a toast with a link to preferences when a 401 error is encountered.
 */
export function useAuthErrorHandler(error: Error | undefined): void {
  useEffect(() => {
    if (error && error instanceof ApiError && error.status === 401) {
      showToast({
        style: Toast.Style.Failure,
        title: "Authentication Failed",
        message: "Please check your API token in preferences",
        primaryAction: {
          title: "Open Preferences",
          onAction: () => openExtensionPreferences(),
        },
      });
    }
  }, [error]);
}
