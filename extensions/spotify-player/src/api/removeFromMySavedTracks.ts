import { invalidateCache } from "../helpers/apiCache";
import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type RemoveFromMySavedTracksProps = {
  trackIds: string[];
};

export async function removeFromMySavedTracks({ trackIds }: RemoveFromMySavedTracksProps) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.deleteMeTracks(trackIds.join());
    invalidateCache("api:library:tracks");
    invalidateCache("api:currently-playing");
    invalidateCache(`api:liked:${trackIds.join(",")}`);
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("removeFromMySavedTracks.ts Error:", error);
    throw new Error(error);
  }
}
