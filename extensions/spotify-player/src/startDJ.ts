import { showHUD } from "@raycast/api";
import { getErrorMessage } from "./helpers/getError";
import { runSpotifyScript, SpotifyScriptType } from "./helpers/script";
import { setSpotifyClient } from "./helpers/withSpotifyClient";

export default async function Command() {
  await setSpotifyClient();

  try {
    // API doesn't support playing DJ, only AppleScript does
    // await play({ id: "37i9dQZF1EYkqdzj48dyYq", type: "track" });
    await runSpotifyScript(SpotifyScriptType.PlayTrack, true, "spotify:playlist:37i9dQZF1EYkqdzj48dyYq");
  } catch (err) {
    const error = getErrorMessage(err);
    await showHUD(error);
  }
}
