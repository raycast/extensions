import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "./utils";
import { showNextTrackNotification } from "./trackNotification";

export default async () => {
  const script = buildScriptEnsuringSpotifyIsRunning(`next track`);
  await runAppleScriptSilently(script);
  await showNextTrackNotification();
};
