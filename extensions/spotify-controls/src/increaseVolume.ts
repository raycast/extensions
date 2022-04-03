import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "./utils";
export default async () => {
  const script = buildScriptEnsuringSpotifyIsRunning(`set sound volume to sound volume + 10`);
  await runAppleScriptSilently(script);
};
