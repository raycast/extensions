import { runAppleScript } from "@raycast/utils";
import { buildScriptEnsuringSpotifyIsRunning } from "../helpers/applescript";
import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function skipToPrevious() {
  const { spotifyClient } = getSpotifyClient();

  try {
    await spotifyClient.postMePlayerPrevious();
  } catch (err) {
    const error = getErrorMessage(err);

    if (
      error?.toLocaleLowerCase().includes("restricted device") ||
      error?.toLocaleLowerCase().includes("premium required")
    ) {
      const script = buildScriptEnsuringSpotifyIsRunning("previous track");
      await runAppleScript(script);
      return;
    }

    console.log("skipToPrevious.ts Error:", error);
    throw new Error(error);
  }
}
