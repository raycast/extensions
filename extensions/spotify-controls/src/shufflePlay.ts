import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "./utils";

export default async () => {
  const script = buildScriptEnsuringSpotifyIsRunning(`
    set shuffling to true
    set spotify_playing to (player state = playing)
    if not spotify_playing then
      play
    end if
  `);

  await runAppleScriptSilently(script);
};
