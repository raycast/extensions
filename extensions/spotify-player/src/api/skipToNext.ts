import { getErrorMessage } from "../helpers/getError";
import { runSpotifyScript, SpotifyScriptType } from "../helpers/script";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function skipToNext() {
  const { spotifyClient } = getSpotifyClient();

  try {
    await spotifyClient.postMePlayerNext();
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
