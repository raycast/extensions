import { showHUD, showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { TTSApiError } from "./api/minimax-tts";
import { clearExternalStopRequest, stopExternalPlayback } from "./utils/audio-player";
import { getLastReadingSession, updateReadingProgress } from "./utils/reading-session";
import { playReadingSession } from "./utils/reading-runner";

export default async function ResumeReading() {
  const wasPlaying = stopExternalPlayback();
  if (wasPlaying) {
    await showHUD("Stopped");
    return;
  }

  clearExternalStopRequest();

  try {
    let session = await getLastReadingSession();
    if (!session) {
      await showHUD("No previous reading");
      return;
    }

    if (session.nextChunkIndex >= session.chunks.length) {
      session = await updateReadingProgress(session, 0);
    }

    await playReadingSession(session, session.nextChunkIndex > 0);
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
