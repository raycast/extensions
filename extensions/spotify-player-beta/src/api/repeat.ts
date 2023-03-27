import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function repeat(state: "track" | "context" | "off") {
  const { spotifyClient } = getSpotifyClient();
  await spotifyClient.putMePlayerRepeat(state);
}
