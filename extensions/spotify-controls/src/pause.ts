import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "./utils";

export default async () => {
  const script = buildScriptEnsuringSpotifyIsRunning("pause");
  await runAppleScriptSilently(script);
};
