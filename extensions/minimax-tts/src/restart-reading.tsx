import { showHUD } from "@raycast/api";
import { clearExternalStopRequest, stopExternalPlayback } from "./utils/audio-player";
import { getLastReadingSession, restartReadingSession } from "./utils/reading-session";
import { playReadingSession } from "./utils/reading-runner";
import { presentCommandError } from "./utils/errors";
import { clearPlaybackState } from "./utils/playback-state";

export default async function RestartReading() {
  // Restart always restarts. If something is already playing, stop it first
  // so the new playback can take over without a confusing "Stopped" toggle.
  stopExternalPlayback();
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
