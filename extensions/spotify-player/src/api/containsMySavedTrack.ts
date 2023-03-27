import { getSpotifyClient } from "../helpers/withSpotifyClient";

type ContainsMySavedTracksProps = {
  trackIds: string[];
};

export async function containsMySavedTracks({ trackIds }: ContainsMySavedTracksProps) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getMeTracksContains(trackIds.join());
  return response;
}
