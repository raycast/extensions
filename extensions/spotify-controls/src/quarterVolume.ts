import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "./utils";

export default async () => {
  const script = buildScriptEnsuringSpotifyIsRunning(`set sound volume to 25`);
  await runAppleScriptSilently(script);
};
