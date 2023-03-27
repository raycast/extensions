import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getMyDevices() {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getMePlayerDevices();
  return response;
}
