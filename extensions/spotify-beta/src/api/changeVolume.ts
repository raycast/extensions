import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function changeVolume(volume: number) {
  const { spotifyClient } = getSpotifyClient();
  await spotifyClient.putMePlayerVolume(volume);
}
