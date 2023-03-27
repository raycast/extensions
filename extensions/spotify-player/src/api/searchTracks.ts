import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function searchTracks(query: string, limit: number) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.search(query, ["track"], { limit });
  return response.tracks;
}
