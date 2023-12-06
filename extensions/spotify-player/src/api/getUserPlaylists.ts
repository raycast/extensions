import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { iterate } from "../helpers/spotifyIterator";
import { SimplifiedPlaylistObject } from "../helpers/spotify.api";

type GetUserPlaylistsProps = { limit: number };

export async function getUserPlaylists({ limit }: GetUserPlaylistsProps) {
  const { spotifyClient } = getSpotifyClient();
  const iterator = iterate<SimplifiedPlaylistObject>(limit, (input) => spotifyClient.getMePlaylists(input));
  try {
    const playlists: SimplifiedPlaylistObject[] = [];
    for await (const items of iterator) {
      playlists.push(...items);
    }
    return { items: playlists };
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getUserPlaylists.ts Error:", error);
    throw new Error(error);
  }
}
