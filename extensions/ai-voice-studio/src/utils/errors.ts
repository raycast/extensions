import { LaunchType, Toast, launchCommand, openExtensionPreferences, showToast } from "@raycast/api";
import { TTSApiError } from "../api/minimax-tts";
import { openProviderSetupCommand } from "./provider-setup-command";

const CONFIG_ERROR_CODES = new Set([-1, -6]);

export async function presentCommandError(error: unknown, fallbackTitle = "MiniMax TTS Error"): Promise<void> {
  if (error instanceof TTSApiError) {
    if (CONFIG_ERROR_CODES.has(error.code)) {
      await showToast({
        style: Toast.Style.Failure,
        title: error.code === -1 ? "Configuration Required" : "Model Not Available",
        message: error.message,
        primaryAction: getConfigurationAction(error.message),
      });
      return;
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "TTS Error",
      message: error.message,
      primaryAction: {
        title: "Setup Voice Defaults",
        onAction: openProviderSetupCommand,
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

function getConfigurationAction(message: string) {
  return isCredentialError(message)
    ? { title: "Open API Key Preferences", onAction: openExtensionPreferences }
    : { title: "Setup Voice Defaults", onAction: openProviderSetupCommand };
}

function isCredentialError(message: string): boolean {
  return /\b(api\s*)?key\b/i.test(message);
}

export async function showResumeSuggestion(title: string, message: string): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
    primaryAction: {
      title: "Resume Last Reading",
      onAction: async () => {
        try {
          await launchCommand({ name: "resume-reading", type: LaunchType.UserInitiated });
        } catch {
          // resume-reading is no-view; if launch fails, fall back silently
        }
      },
    },
  });
}
