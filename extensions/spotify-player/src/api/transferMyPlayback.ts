import { invalidateCache } from "../helpers/apiCache";
import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

// Moves to another device that succeeded in this command. Each command counts its own.
let transfers = 0;
export const transfersMade = () => transfers;

// Moves reach Spotify one at a time, in the order they were asked for, so quick moves end on the device chosen last.
let queue: Promise<unknown> = Promise.resolve();
// Settles once the moves asked for so far have, whether they succeeded or failed.
export const transfersSettled = () => queue;

export function transferMyPlayback(deviceId: string, play?: boolean) {
  const transfer = queue.then(() => _transferMyPlayback(deviceId, play));
  queue = transfer.catch(() => undefined);
  return transfer;
}

async function _transferMyPlayback(deviceId: string, play?: boolean) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.putMePlayer({ device_ids: [deviceId], play });
    transfers++;
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("transferMyPlayback.ts Error:", error);
    throw new Error(error);
  } finally {
    // Another device is active now, and cached playback state would still show the old one.
    invalidateCache("api:currently-playing");
  }
}
