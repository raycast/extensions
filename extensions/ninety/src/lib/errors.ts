import { openExtensionPreferences } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { NinetyError } from "../api/client";

function needsPreferences(error: unknown) {
  return error instanceof NinetyError && (error.status === 401 || error.status === 400);
}

export async function showError(error: unknown, title = "Something went wrong"): Promise<void> {
  await showFailureToast(error, {
    title,
    primaryAction: needsPreferences(error)
      ? { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() }
      : undefined,
  });
}
