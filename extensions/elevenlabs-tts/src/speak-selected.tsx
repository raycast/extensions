import { showToast, Toast, getPreferenceValues, getSelectedText } from "@raycast/api";
import { AudioManager } from "./audio/AudioManager";
import { prepareVoiceSettings } from "./voice/settings";
import { validateSelectedText } from "./text/validation";
import { getTextStats } from "./text/processing";
import { getTextPreview } from "./text/processing";
import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);

/**
 * Main command handler for the Raycast extension
 * Orchestrates the text-to-speech process:
 * 1. Validates selected text
 * 2. Prepares voice settings
 * 3. Streams audio from ElevenLabs
 * 4. Provides user feedback through toasts
 *
 * @throws {Error} with user-friendly messages for all error cases
 */
export default async function Command() {
  try {
    // First, check for and stop any existing audio playback
    try {
      const { stdout } = await execAsync("pgrep afplay");
      if (stdout.trim()) {
        await execAsync(`pkill afplay`);
        console.log("Stopped existing audio playback");
        await showToast({
          style: Toast.Style.Success,
          title: "⏹️ Stopped existing audio playback",
        });
        return;
      }
    } catch (error) {
      // No existing audio processes found, continue with new playback
      console.log("No existing audio processes found");
    }

    console.log("Starting TTS command");
    await showToast({ style: Toast.Style.Animated, title: "🔍 Checking for selected text..." });

    const text = await getSelectedText();
    const selectedText = validateSelectedText(text);
    const { wordCount } = getTextStats(selectedText);
    const previewText = getTextPreview(selectedText);

    const preferences = getPreferenceValues<Preferences.SpeakSelected>();
    const settings = prepareVoiceSettings(preferences);

    await showToast({
      style: Toast.Style.Animated,
      title: `🎙️ Processing ${wordCount} words`,
    });

    const audioManager = new AudioManager({
      text: selectedText,
      voiceId: preferences.voiceId,
      apiKey: preferences.elevenLabsApiKey,
      settings,
      playbackSpeed: preferences.playbackSpeed,
    });

    await showToast({
      style: Toast.Style.Success,
      title: `▶️ Now speaking: "${previewText}"`,
    });

    await audioManager.streamAndPlay();
  } catch (error) {
    console.error("Command error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: `❌ ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
}
