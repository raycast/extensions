import { Clipboard, Toast, showToast } from "@raycast/api";
import { TTSApiError } from "../api/mimo-tts";
import { openProviderSetupCommand } from "./provider-setup-command";
import { getConfigurationAction, isCredentialErrorCode } from "./credential-action";

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

/**
 * Show a consistent failure toast for any TTS error. Configuration errors
 * surface a setup action so the user can act on them.
 * Every error toast also exposes Copy Error Details so users can report issues.
 */
export async function showTTSFailure(error: unknown, fallbackTitle = "MiMo TTS Error"): Promise<void> {
  const { message, code } = describe(error);
  const detail = code !== undefined ? `${message} (code ${code})` : message;

  if (error instanceof TTSApiError && isCredentialErrorCode(error.code)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Configuration Required",
      message: detail,
      primaryAction: getConfigurationAction(error.code),
      secondaryAction: { title: "Copy Error Details", onAction: copyDetail(detail) },
    });
    return;
  }

  await showToast({
    style: Toast.Style.Failure,
    title: fallbackTitle,
    message: detail,
    primaryAction: { title: "Copy Error Details", onAction: copyDetail(detail) },
    secondaryAction: { title: "Setup Voice Defaults", onAction: openProviderSetupCommand },
  });
}
