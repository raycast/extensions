import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "./utils";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";

export default async () => {
  const preferences = getPreferenceValues<Preferences>();

  const script = buildScriptEnsuringSpotifyIsRunning(`set sound volume to sound volume - ${preferences.volumeStep}`);
  await runAppleScriptSilently(script);
};
