import { runAppleScript } from "@raycast/utils";
import { buildScriptEnsuringSpotifyIsRunning } from "../helpers/applescript";
import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function changeVolume(volume: number) {
  const { spotifyClient } = getSpotifyClient();

  try {
    await spotifyClient.putMePlayerVolume(volume);
  } catch (err) {
    const error = getErrorMessage(err);

    if (
      error?.toLocaleLowerCase().includes("restricted device") ||
      error?.toLocaleLowerCase().includes("premium required")
    ) {
      const script = buildScriptEnsuringSpotifyIsRunning(`set sound volume to ${volume}`);
      await runAppleScript(script);
      return;
    }

    console.log("changeVolume.ts Error:", error);
    throw new Error(error);
  }
}
