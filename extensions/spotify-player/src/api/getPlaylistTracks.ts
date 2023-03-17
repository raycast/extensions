import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getPlaylistTracks(playlistId: string) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getPlaylistTracks(playlistId);
  return response.body;
}
