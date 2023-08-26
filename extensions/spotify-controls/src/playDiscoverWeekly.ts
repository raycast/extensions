import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "./utils";
export default async () => {
  const script = buildScriptEnsuringSpotifyIsRunning(`play track "spotify:playlist:37i9dQZEVXcQMiQXJGIMRO"`);
  await runAppleScriptSilently(script);
};
