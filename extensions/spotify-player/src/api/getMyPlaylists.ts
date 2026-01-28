import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type GetUserPlaylistsProps = { limit?: number };

export async function getMyPlaylists({ limit = 50 }: GetUserPlaylistsProps = {}) {
  const { spotifyClient } = getSpotifyClient();
  let response = null;
  let nextUrl = null;

  try {
    response = await spotifyClient.getMePlaylists({ limit });
    nextUrl = response?.next;

    while (nextUrl) {
      const nextResponse = await spotifyClient.getNext(nextUrl);
      response = {
        ...response,
        ...nextResponse,
        items: [...(response?.items ?? []), ...(nextResponse.items ?? [])],
      };
      nextUrl = nextResponse?.next;
    }

    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getMyPlaylists.ts Error:", error);
    throw new Error(error);
  }
}
