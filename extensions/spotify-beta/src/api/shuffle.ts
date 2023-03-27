import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function shuffle(state: boolean) {
  const { spotifyClient } = getSpotifyClient();
  await spotifyClient.putMePlayerShuffle(state);
}
