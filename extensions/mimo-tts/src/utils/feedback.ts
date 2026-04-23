import { Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { TTSApiError } from "../api/mimo-tts";

const CONFIG_ERROR_CODES = new Set([-1, 401, 403]);

function isConfigError(error: TTSApiError): boolean {
  return CONFIG_ERROR_CODES.has(error.code);
}

/**
 * Show a consistent failure toast for any TTS error. Configuration errors
 * surface a "Open Preferences" primary action so the user can act on them.
 */
export async function showTTSFailure(error: unknown, fallbackTitle = "MiMo TTS Error"): Promise<void> {
  if (error instanceof TTSApiError) {
    if (isConfigError(error)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Configuration Required",
        message: error.message,
        primaryAction: { title: "Open Preferences", onAction: () => openExtensionPreferences() },
      });
      return;
    }
    await showToast({ style: Toast.Style.Failure, title: fallbackTitle, message: error.message });
    return;
  }

  await showToast({
    style: Toast.Style.Failure,
    title: fallbackTitle,
    message: error instanceof Error ? error.message : String(error),
  });
}
