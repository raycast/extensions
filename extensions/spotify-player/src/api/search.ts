import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function search(query: string, limit: number) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.search(query, ["track", "artist", "album", "playlist"], { limit });
  return response.body;
}
