import { openExtensionPreferences } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { VikunjaApiError } from "../api/client";

export async function showVikunjaErrorToast(error: unknown, title: string) {
  if (error instanceof VikunjaApiError && error.status === 401) {
    await showFailureToast(error, {
      title,
      message:
        "Invalid API token. Regenerate the token in Vikunja and update the Raycast preference.",
      primaryAction: {
        title: "Open Extension Preferences",
        onAction: openExtensionPreferences,
      },
    });
    return;
  }

  if (error instanceof VikunjaApiError && error.status === 521) {
    await showFailureToast(error, {
      title,
      message:
        "The Vikunja server is down or refusing connections. Check the instance and try again.",
    });
    return;
  }

  await showFailureToast(error, { title });
}

export function getVikunjaErrorMessage(error: unknown) {
  if (error instanceof VikunjaApiError) {
    if (error.status === 401) {
      return "Invalid API token. Regenerate the token in Vikunja and update the extension preferences.";
    }

    if (error.status === 521) {
      return "Vikunja is unavailable right now. HTTP 521 means the proxy could not reach the origin server.";
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}
