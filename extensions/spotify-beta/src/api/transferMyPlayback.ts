import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function transferMyPlayback(deviceId: string, play?: boolean) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.putMePlayer({ device_ids: [deviceId], play });
  return response;
}
