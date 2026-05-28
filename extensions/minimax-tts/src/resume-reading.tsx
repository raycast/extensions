import { showHUD } from "@raycast/api";
import { clearExternalStopRequest, stopExternalPlayback } from "./utils/audio-player";
import { getLastReadingSession, updateReadingProgress } from "./utils/reading-session";
import { playReadingSession } from "./utils/reading-runner";
import { presentCommandError } from "./utils/errors";
import { clearPlaybackState } from "./utils/playback-state";

export default async function ResumeReading() {
  // Resume always resumes. If something is already playing, stop it first
  // so the resumed playback can take over without a confusing "Stopped" toggle.
  stopExternalPlayback();
  clearExternalStopRequest();
  await clearPlaybackState();

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
    await presentCommandError(error, "Failed to resume reading");
  }
}
