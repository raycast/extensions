import { getSpotifyClient } from "../helpers/withSpotifyClient";

type ContainsMySavedTracksProps = {
  trackIds: string[];
};

export async function containsMySavedTracks({ trackIds }: ContainsMySavedTracksProps) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.containsMySavedTracks(trackIds);
  return response.body;
}
