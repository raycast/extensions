import { showHUD } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { getErrorMessage } from "./helpers/getError";
import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "./helpers/applescript";

export default async function Command() {
  await setSpotifyClient();

  try {
    // API doesn't support playing DJ, only AppleScript does
    // await play({ id: "37i9dQZF1EYkqdzj48dyYq", type: "track" });
    const script = buildScriptEnsuringSpotifyIsRunning(`play track "spotify:playlist:37i9dQZF1EYkqdzj48dyYq"`);
    await runAppleScriptSilently(script);
  } catch (err) {
    const error = getErrorMessage(err);
    await showHUD(error);
  }
}
