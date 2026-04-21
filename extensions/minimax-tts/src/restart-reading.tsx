import { showHUD, showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { TTSApiError } from "./api/minimax-tts";
import { clearExternalStopRequest, stopExternalPlayback } from "./utils/audio-player";
import { getLastReadingSession, restartReadingSession } from "./utils/reading-session";
import { playReadingSession } from "./utils/reading-runner";

export default async function RestartReading() {
  const wasPlaying = stopExternalPlayback();
  if (wasPlaying) {
    await showHUD("Stopped");
    return;
  }

  clearExternalStopRequest();

  try {
    const lastSession = await getLastReadingSession();
    if (!lastSession) {
      await showHUD("No previous reading");
      return;
    }

    const session = await restartReadingSession(lastSession);
    await playReadingSession(session, false);
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
