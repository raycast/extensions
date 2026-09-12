import { delay } from "../helpers/delay";
import { getErrorMessage } from "../helpers/getError";
import { runSpotifyScript, SpotifyScriptType } from "../helpers/script";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function skipToNext() {
  const { spotifyClient } = getSpotifyClient();

  try {
    await spotifyClient.postMePlayerNext();
    // Wait for the track to actually skip
    await delay(100);
  } catch (err) {
    const error = getErrorMessage(err);

    if (
      error?.toLocaleLowerCase().includes("restricted device") ||
      error?.toLocaleLowerCase().includes("premium required")
    ) {
      await runSpotifyScript(SpotifyScriptType.NextTrack);
      return;
    }

    console.log("skipToNext.ts Error:", error);
    throw new Error(error);
  }
}
