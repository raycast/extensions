import { showHUD, showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { TTSApiError } from "./api/minimax-tts";
import { clearExternalStopRequest, stopExternalPlayback } from "./utils/audio-player";
import { getReadableText } from "./utils/text-source";
import { prepareReadingSession } from "./utils/reading-session";
import { playReadingSession } from "./utils/reading-runner";
import { buildDefaultOptionsFromPrefs } from "./utils/voice-preferences";

export default async function QuickRead() {
  // Toggle: if our afplay is already running, stop it and return
  const wasPlaying = stopExternalPlayback();
  if (wasPlaying) {
    await showHUD("Stopped");
    return;
  }

  clearExternalStopRequest();

  try {
    const readableText = await getReadableText();
    if (!readableText) {
      await showHUD("No selected text or clipboard text");
      return;
    }

    const options = await buildDefaultOptionsFromPrefs();
    const { session, isResuming } = await prepareReadingSession(readableText.text, readableText.source, options);
    await playReadingSession(session, isResuming);
  } catch (error) {
    if (error instanceof TTSApiError) {
      if (error.code === -1) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Configuration Required",
          message: error.message,
          primaryAction: { title: "Open Preferences", onAction: () => openExtensionPreferences() },
        });
        return;
      }
      await showHUD(`TTS error: ${error.message}`);
      return;
    }

    await showHUD(`Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}
