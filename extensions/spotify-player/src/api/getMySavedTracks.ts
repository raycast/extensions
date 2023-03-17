import { getSpotifyClient } from "../helpers/withSpotifyClient";

type GetMySavedTracksProps = { limit?: number };

export async function getMySavedTracks({ limit = 20 }: GetMySavedTracksProps = {}) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getMySavedTracks({ limit });
  return response.body;
}
