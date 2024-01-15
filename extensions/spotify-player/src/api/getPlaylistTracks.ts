import { getErrorMessage } from "../helpers/getError";
import { SimplifiedTrackObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getPlaylistTracks(playlistId: string, limit: number) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.getPlaylistsByPlaylistIdTracks(playlistId, { limit });

    // Normalize the response to match the SimplifiedTrackObject type
    // because the Spotify API returns a SavedTrackObject type
    const tracks = (response?.items ?? []).map((trackItem) => {
      return {
        ...(trackItem.track || {}),
      };
    });

    return { items: tracks as SimplifiedTrackObject[] };
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getPlaylistTracks.ts Error:", error);
    throw new Error(error);
  }
}
