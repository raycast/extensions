import { withCache } from "../helpers/apiCache";
import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type GetUserPlaylistsProps = { limit?: number };

async function _getMyPlaylists({ limit = 50 }: GetUserPlaylistsProps = {}) {
  const { spotifyClient } = getSpotifyClient();
  let response = null;
  let nextUrl = null;

  try {
    response = await spotifyClient.getMePlaylists({ limit });
    nextUrl = response?.next;

    while (nextUrl) {
      const nextResponse = await spotifyClient.getNext(nextUrl);
      (response.items ??= []).push(...(nextResponse.items ?? []));
      nextUrl = nextResponse?.next;
    }

    return { ...response, next: null };
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getMyPlaylists.ts Error:", error);
    throw new Error(error);
  }
}

const getCachedPlaylists = withCache("api:playlists", 300000, _getMyPlaylists);
let pending: ReturnType<typeof getCachedPlaylists> | undefined;

export function getMyPlaylists() {
  // Library and action consumers share one catalog request, including cold cache misses.
  return (pending ??= getCachedPlaylists().finally(() => {
    pending = undefined;
  }));
}
