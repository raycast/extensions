import { Clipboard, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { TTSApiError } from "../api/openai-tts";

const CONFIG_ERROR_CODES = new Set([-1, 401, 403]);

function describe(error: unknown): { message: string; code?: number } {
  if (error instanceof TTSApiError) return { message: error.message, code: error.code };
  if (error instanceof Error) return { message: error.message };
  return { message: String(error) };
}

function copyDetail(detail: string): () => Promise<void> {
  return async () => {
    await Clipboard.copy(detail);
    await showToast({ style: Toast.Style.Success, title: "Error details copied" });
  };
}

export async function showTTSFailure(error: unknown, fallbackTitle = "OpenAI TTS Error"): Promise<void> {
  const { message, code } = describe(error);
  const detail = code !== undefined ? `${message} (code ${code})` : message;

  if (error instanceof TTSApiError && CONFIG_ERROR_CODES.has(error.code)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Configuration Required",
      message: detail,
      primaryAction: { title: "Open Preferences", onAction: () => openExtensionPreferences() },
      secondaryAction: { title: "Copy Error Details", onAction: copyDetail(detail) },
    });
    return;
  }

  await showToast({
    style: Toast.Style.Failure,
    title: fallbackTitle,
    message: detail,
    primaryAction: { title: "Copy Error Details", onAction: copyDetail(detail) },
    secondaryAction: { title: "Open Preferences", onAction: () => openExtensionPreferences() },
  });
}
