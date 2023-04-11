import { runAppleScript } from "run-applescript";
import { buildScriptEnsuringSpotifyIsRunning } from "../helpers/applescript";
import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { checkSpotifyApp } from "../helpers/isSpotifyInstalled";

export async function pause() {
  const { spotifyClient } = getSpotifyClient();

  async function checkIfSpotifyIsRunning() {
    const response = await runAppleScript(`
    if application "Spotify" is running then
        return "Spotify is running"
      else
        return "Spotify is not running"
      end if
    `);
    return response === "Spotify is running";
  }

  try {
    await spotifyClient.putMePlayerPause();
  } catch (err) {
    const error = getErrorMessage(err);

    if (error?.toLocaleLowerCase().includes("restricted device")) {
      const isSpotifyInstalled = await checkSpotifyApp();
      const isSpotifyRunning = await checkIfSpotifyIsRunning();
      if (isSpotifyInstalled && isSpotifyRunning) {
        const script = buildScriptEnsuringSpotifyIsRunning("pause");
        await runAppleScript(script);
        return;
      }
    }
    console.log("pause.ts Error: ", error);
    throw new Error(error);
  }
}
