import { showHUD } from "@raycast/api";
import { getErrorMessage } from "../helpers/getError";
import { runSpotifyScript, SpotifyScriptType, WinNotSupportedError } from "../helpers/script";
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
      await runSpotifyScript(SpotifyScriptType.SetVolume, false, volume);
      return;
    }

    console.log("changeVolume.ts Error:", error);
    throw new Error(error);
  }
}

export async function changeVolumeWithHUD(volume: number) {
  try {
    await changeVolume(volume);
    await showHUD(`Volume set to ${volume}%`);
  } catch (error) {
    await showHUD(error instanceof WinNotSupportedError ? error.message : "No active device");
  }
}
