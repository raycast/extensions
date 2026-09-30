import { getErrorMessage } from "../helpers/getError";
import { PagingPlaylistTrackObject, PlaylistTrackObject, SimplifiedTrackObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getPlaylistTracks(playlistId: string, limit: number, offset?: number) {
  const { spotifyClient } = getSpotifyClient();
  const tracks: SimplifiedTrackObject[] = [];
  let next: string | null = null;
  let currentOffset = offset ?? 0;

  try {
    let response: PagingPlaylistTrackObject;
    do {
      response = await spotifyClient.getPlaylistsByPlaylistIdTracks(playlistId, {
        limit: Math.min(limit - tracks.length, 50),
        offset: currentOffset,
      });

      if (response.items) {
        const normalizedTracks = (response?.items ?? []).map((trackItem: PlaylistTrackObject) => {
          return {
            ...(trackItem.track || {}),
          };
        });
        tracks.push(...(normalizedTracks as SimplifiedTrackObject[]));
      }

      next = response.next;
      currentOffset += 50;
    } while (next && tracks.length < limit && response.items && response.items.length > 0);

    return { items: tracks };
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getPlaylistTracks.ts Error:", error);
    throw new Error(error);
  }
}
