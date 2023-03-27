import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function transferMyPlayback(deviceId: string) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.putMePlayer({ device_ids: [deviceId] });
  return response;
}
