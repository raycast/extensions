import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "./utils";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";

export default async () => {
  const preferences = getPreferenceValues<Preferences>();

  const script = buildScriptEnsuringSpotifyIsRunning(`
        if player state is playing then
            set playPos to player position - ${preferences.secondsToSkip}
            set player position to playPos
        end if
    `);

  await runAppleScriptSilently(script);
};
