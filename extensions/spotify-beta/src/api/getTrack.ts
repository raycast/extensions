import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getTrack(trackId: string) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getTracksById(trackId);
  return response;
}
