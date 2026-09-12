import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "./utils";

export default async () => {
  const script = buildScriptEnsuringSpotifyIsRunning(`set sound volume to 100`);
  await runAppleScriptSilently(script);
};
