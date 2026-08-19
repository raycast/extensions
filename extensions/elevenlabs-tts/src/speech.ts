import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { AudioManager } from "./audio/AudioManager";
import { beginSpeechSession, endSpeechSession, stopActivePlayback } from "./audio/playback";
import { getTextPreview, getTextStats } from "./text/processing";
import { prepareVoiceSettings } from "./voice/settings";

async function showActiveSessionStatus(): Promise<void> {
  const stopped = await stopActivePlayback();
  await showToast({
    style: Toast.Style.Success,
    title: stopped ? "⏹️ Stopped" : "🎙️ Already reading",
  });
}

export async function speakText(getText: () => Promise<string>): Promise<void> {
  let sessionId: string | undefined;
  try {
    sessionId = await beginSpeechSession();
    if (!sessionId) {
      await showActiveSessionStatus();
      return;
    }

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
      sessionId,
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
  } finally {
    if (sessionId) await endSpeechSession(sessionId);
  }
}
