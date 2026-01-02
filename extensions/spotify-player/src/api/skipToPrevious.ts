import { delay } from "../helpers/delay";
import { getErrorMessage } from "../helpers/getError";
import { runSpotifyScript, SpotifyScriptType } from "../helpers/script";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function skipToPrevious() {
  const { spotifyClient } = getSpotifyClient();

  try {
    await spotifyClient.postMePlayerPrevious();
    // Wait for the track to actually skip
    await delay(100);
  } catch (err) {
    const error = getErrorMessage(err);

    if (
      error?.toLocaleLowerCase().includes("restricted device") ||
      error?.toLocaleLowerCase().includes("premium required")
    ) {
      await runSpotifyScript(SpotifyScriptType.PreviousTrack);
      return;
    }

    console.log("skipToPrevious.ts Error:", error);
    throw new Error(error);
  }
}
