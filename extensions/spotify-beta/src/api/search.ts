import { getSpotifyClient } from "../helpers/withSpotifyClient";

type SearchProps = { query: string; limit: number };

export async function search({ query, limit }: SearchProps) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.search(query, ["track", "artist", "album", "playlist", "show", "episode"], {
    limit,
  });
  return response;
}
