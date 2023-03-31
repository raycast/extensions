import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type AddToMySavedTracksProps = {
  trackIds: string[];
};

export async function addToMySavedTracks({ trackIds }: AddToMySavedTracksProps) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.putMeTracks(trackIds.join());
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("addToMySavedTracks.ts Error:", error);
    throw new Error(error);
  }
}
