import { runAppleScript } from "run-applescript";
import { buildScriptEnsuringSpotifyIsRunning } from "../helpers/applescript";
import { getErrorMessage } from "../helpers/getError";
import { checkSpotifyApp } from "../helpers/isSpotifyInstalled";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

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

  async function tryWithAppleScript() {
    const script = buildScriptEnsuringSpotifyIsRunning("pause");
    await runAppleScript(script);
    return;
  }

  const isSpotifyInstalled = await checkSpotifyApp();
  const isSpotifyRunning = await checkIfSpotifyIsRunning();

  if (isSpotifyInstalled && isSpotifyRunning) {
    tryWithAppleScript();
  } else {
    try {
      await spotifyClient.putMePlayerPause();
    } catch (err) {
      const error = getErrorMessage(err);
      console.log("pause.ts Error: ", error);
      throw new Error(error);
    }
  }
}
