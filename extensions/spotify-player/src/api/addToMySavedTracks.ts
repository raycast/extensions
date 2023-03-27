import { getSpotifyClient } from "../helpers/withSpotifyClient";

type AddToMySavedTracksProps = {
  trackIds: string[];
};

export async function addToMySavedTracks({ trackIds }: AddToMySavedTracksProps) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.putMeTracks(trackIds.join());
  return response;
}
