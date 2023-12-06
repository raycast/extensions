import { getErrorMessage } from "../helpers/getError";
import { PlaylistTrackObject, SimplifiedTrackObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getPlaylistTracks(playlistId: string, limit: number, offset: number = 0) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.getPlaylistsByPlaylistIdTracks(playlistId, {
      limit,
      offset,
    });

    const tracks = (response?.items ?? []).map((trackItem: PlaylistTrackObject) => {
      return {
        ...(trackItem.track || {}),
      };
    }) as SimplifiedTrackObject[];

    return { items: tracks };
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getPlaylistTracks.ts Error:", error);
    throw new Error(error);
  }
}
