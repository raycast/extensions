import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { DevicesObject } from "../helpers/spotify.api";
import { transfersMade } from "./transferMyPlayback";

async function _getMyDevices() {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.getMePlayerDevices();
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getMyDevices.ts Error:", error);
    throw new Error(error);
  }
}

// Not cached: playback moves to another device from anywhere, and a list from before would show the device it left,
// or have Play move it back there.
export async function getMyDevices(): Promise<DevicesObject> {
  const transfers = transfersMade();
  const answer = _getMyDevices();
  await answer.catch(() => undefined);
  // Spotify may have answered a request sent before playback moved to another device here from before, with the
  // devices or an error, so ask again.
  return transfersMade() === transfers ? answer : getMyDevices();
}
