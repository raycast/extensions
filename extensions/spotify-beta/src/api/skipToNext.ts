import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "../helpers/applescript";
import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function skipToNext() {
  const { spotifyClient } = getSpotifyClient();

  try {
    await spotifyClient.postMePlayerNext();
  } catch (err) {
    const error = getErrorMessage(err);

    if (error?.toLocaleLowerCase().includes("restricted device")) {
      const script = buildScriptEnsuringSpotifyIsRunning("next track");
      await runAppleScriptSilently(script);
      return;
    }

    console.log("skipToNext.ts Error:", error);
    throw new Error(error);
  }
}
