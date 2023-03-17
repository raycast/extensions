import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getMe() {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getMe();
  return response.body;
}
