import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { AudioManager } from "./audio/AudioManager";
import { stopActivePlayback } from "./audio/playback";
import { getTextPreview, getTextStats } from "./text/processing";
import { prepareVoiceSettings } from "./voice/settings";

async function stopExistingPlayback(): Promise<boolean> {
  if (!(await stopActivePlayback())) return false;

  await showToast({
    style: Toast.Style.Success,
    title: "⏹️ Stopped",
  });
  return true;
}

export async function speakText(getText: () => Promise<string>): Promise<void> {
  try {
    if (await stopExistingPlayback()) return;

    await showToast({
      style: Toast.Style.Animated,
      title: "Reading...",
    });

    const text = await getText();
    const { wordCount } = getTextStats(text);
    const previewText = getTextPreview(text, 40);
    const preferences = getPreferenceValues<Preferences>();
    const settings = prepareVoiceSettings(preferences);

    const audioManager = new AudioManager({
      text,
      voiceId: preferences.voiceId,
      apiKey: preferences.elevenLabsApiKey,
      settings,
      playbackSpeed: preferences.playbackSpeed,
    });

    await showToast({
      style: Toast.Style.Success,
      title: `🎙️ ${wordCount} words`,
      message: `"${previewText}"`,
    });

    await audioManager.streamAndPlay();
  } catch (error) {
    console.error("Command error:", error);
    await showFailureToast(error, {
      title: "Failed to play audio",
    });
  }
}
