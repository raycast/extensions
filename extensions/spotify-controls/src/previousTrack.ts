import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "./utils";
import { showPreviousTrackNotification } from "./trackNotification";

export default async () => {
  /**
   * Spotify's "previous track" command restarts the current track when it has been playing for more than ~3 seconds,
   * so a single call often doesn't actually switch to the previous track.
   * To work around this,
   * we check the player position and run the command twice if it's greater than 3 seconds.
   */
  const script = buildScriptEnsuringSpotifyIsRunning(`
      if player position is greater than 3 then
        previous track
        previous track
      else
        previous track
      end if`);
  await runAppleScriptSilently(script);
  await showPreviousTrackNotification();
};
