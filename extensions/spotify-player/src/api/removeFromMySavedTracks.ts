import { getSpotifyClient } from "../helpers/withSpotifyClient";

type RemoveFromMySavedTracksProps = {
  trackIds: string[];
};

export async function removeFromMySavedTracks({ trackIds }: RemoveFromMySavedTracksProps) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.removeFromMySavedTracks(trackIds);
  return response.body;
}
