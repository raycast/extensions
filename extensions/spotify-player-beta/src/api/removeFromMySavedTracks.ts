import { getSpotifyClient } from "../helpers/withSpotifyClient";

type RemoveFromMySavedTracksProps = {
  trackIds: string[];
};

export async function removeFromMySavedTracks({ trackIds }: RemoveFromMySavedTracksProps) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.deleteMeTracks(trackIds.join());
  return response;
}
