import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "./utils";
import { showPreviousTrackNotification } from "./trackNotification";

export default async () => {
  const script = buildScriptEnsuringSpotifyIsRunning("previous track");
  await runAppleScriptSilently(script);
  await showPreviousTrackNotification();
};
