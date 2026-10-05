import { showHUD } from "@raycast/api";
import { clearExternalStopRequest, stopExternalPlayback } from "./utils/audio-player";
import { waitForSessionLockRelease } from "./utils/session-lock";
import { getLastReadingSession, restartReadingSession } from "./utils/reading-session";
import { playReadingSession } from "./utils/reading-runner";
import { presentCommandError } from "./utils/errors";
import { clearPlaybackState } from "./utils/playback-state";

export default async function RestartReading() {
  // Restart always restarts. If something is already playing, stop it first
  // so the new playback can take over without a confusing "Stopped" toggle.
  // Wait for the old session to release its lock before clearing STOP_FILE —
  // otherwise the running reader never observes the signal and the new
  // playReadingSession() call deadlocks on acquireSessionLock().
  const stoppedExisting = stopExternalPlayback();
  if (stoppedExisting) {
    const released = await waitForSessionLockRelease();
    if (!released) {
      await showHUD("Previous reading is still stopping — try again in a moment");
      return;
    }
  }
  clearExternalStopRequest();
  await clearPlaybackState();

  try {
    const lastSession = await getLastReadingSession();
    if (!lastSession) {
      await showHUD("No previous reading");
      return;
    }

    const session = await restartReadingSession(lastSession);
    await playReadingSession(session, false);
  } catch (error) {
    await presentCommandError(error, "Failed to restart reading");
  }
}
