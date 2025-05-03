import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "./utils";

export default async () => {
  const script = buildScriptEnsuringSpotifyIsRunning(`
        if player state is playing then
            set player position to 0
        end if
    `);

  await runAppleScriptSilently(script);
};
