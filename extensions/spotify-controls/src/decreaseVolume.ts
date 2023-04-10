import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "./utils";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";

export default async () => {
  const preferences = getPreferenceValues<Preferences>();
  const volumeStep = isNaN(parseInt(preferences.volumeStep)) ? 10 : parseInt(preferences.volumeStep);

  const script = buildScriptEnsuringSpotifyIsRunning(`set sound volume to sound volume - ${volumeStep}`);
  await runAppleScriptSilently(script);
};
