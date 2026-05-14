import { showHUD } from "@raycast/api";
import { clearExternalStopRequest, stopExternalPlayback } from "./utils/audio-player";
import { getLastReadingSession } from "./utils/reading-session";
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
    const session = await getLastReadingSession();
    if (!session) {
      await showHUD("No previous reading");
      return;
    }

    if (session.nextChunkIndex >= session.chunks.length) {
      await showHUD("Nothing to resume. Use Restart Last Reading to replay.");
      return;
    }

    await playReadingSession(session, session.nextChunkIndex > 0);
  } catch (error) {
    await presentCommandError(error, "Failed to resume reading");
  }
}
