import { getPreferenceValues } from "@raycast/api";
import { getPreferenceDefault } from "./manifest";

/** Extension-level Gemini credentials and TTS model (shared across all commands). */
export function getTtsPreferences(): { geminiApiKey: string; model: string } {
  const { geminiApiKey, ttsModel } = getPreferenceValues<Preferences>();
  return {
    geminiApiKey,
    model: ttsModel.trim() || getPreferenceDefault("ttsModel"),
  };
}
