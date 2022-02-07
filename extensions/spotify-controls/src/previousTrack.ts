import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "./utils";

export default async () => {
  const script = buildScriptEnsuringSpotifyIsRunning("previous track");
  await runAppleScriptSilently(script);
};
