import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { iterateWithOffset } from "../helpers/spotifyIterator";
import { SimplifiedPlaylistObject } from "../helpers/spotify.api";

type GetUserPlaylistsProps = { limit: number };

export async function* getUserPlaylists({
  limit,
}: GetUserPlaylistsProps): AsyncGenerator<
  { playlists: SimplifiedPlaylistObject[]; total: number; offset: number },
  void,
  unknown
> {
  const { spotifyClient } = getSpotifyClient();
  const iterator = iterateWithOffset<SimplifiedPlaylistObject>(limit, (input) => spotifyClient.getMePlaylists(input));
  try {
    for await (const { items, total, offset } of iterator) {
      yield { playlists: items || [], total, offset };
    }
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getUserPlaylists.ts Error:", error);
    throw new Error(error);
  }
}
