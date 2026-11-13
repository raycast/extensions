import { open, openExtensionPreferences } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { NinetyError } from "../api/client";
import { NinetyUrls } from "./urls";

function needsPreferences(error: unknown) {
  return error instanceof NinetyError && (error.status === 401 || error.status === 400);
}

export async function showError(error: unknown, title = "Something went wrong"): Promise<void> {
  const toast = await showFailureToast(error, {
    title,
    primaryAction: needsPreferences(error)
      ? { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() }
      : undefined,
  });
  // A rejected token: offer the page where a new one is generated.
  if (error instanceof NinetyError && error.status === 401) {
    toast.secondaryAction = { title: "Get a Token in Ninety", onAction: () => open(NinetyUrls.developerSettings) };
  }
}
