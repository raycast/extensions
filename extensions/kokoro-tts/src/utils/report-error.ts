import {
  Clipboard,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { DependencySetupError } from "./check-dependencies";

/**
 * Show a failure toast for a TTS error. Dependency setup errors get a
 * "Copy Fix Command" action and a shortcut to the extension preferences.
 */
export async function reportError(
  error: unknown,
  fallbackTitle = "TTS Error",
): Promise<void> {
  if (error instanceof DependencySetupError) {
    await showToast({
      style: Toast.Style.Failure,
      title: error.errorTitle,
      message: error.message,
      primaryAction: error.fixCommand
        ? {
            title: "Copy Fix Command",
            onAction: () => Clipboard.copy(error.fixCommand!),
          }
        : undefined,
      secondaryAction: {
        title: "Open Preferences",
        onAction: () => openExtensionPreferences(),
      },
    });
    return;
  }

  await showToast({
    style: Toast.Style.Failure,
    title: fallbackTitle,
    message: error instanceof Error ? error.message : String(error),
  });
}
