import { runAppleScript } from "@raycast/utils";
import { buildScriptEnsuringSpotifyIsRunning } from "../helpers/applescript";
import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function pause() {
  const { spotifyClient } = getSpotifyClient();
  try {
    await spotifyClient.putMePlayerPause();
  } catch (err) {
    const error = getErrorMessage(err);

    if (error?.toLocaleLowerCase().includes("restricted device")) {
      const script = buildScriptEnsuringSpotifyIsRunning("pause");
      await runAppleScript(script);
      return;
    }
    console.log("pause.ts Error: ", error);
    throw new Error(error);
  }
}
