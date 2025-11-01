import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function addToMySavedTracks({ trackIds }: { trackIds: string[] }) {
  const { spotifyClient } = getSpotifyClient();

  try {
    await spotifyClient.putMeTracks(trackIds.join(","), { ids: trackIds });
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("addToMySavedTracks.ts Error:", error);
    throw new Error(error);
  }
}
