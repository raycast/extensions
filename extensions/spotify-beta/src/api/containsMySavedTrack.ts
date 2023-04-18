import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type ContainsMySavedTracksProps = {
  trackIds: string[];
};

export async function containsMySavedTracks({ trackIds }: ContainsMySavedTracksProps) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.getMeTracksContains(trackIds.join());
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("containsMySavedTracks.ts Error:", error);
    throw new Error(error);
  }
}
