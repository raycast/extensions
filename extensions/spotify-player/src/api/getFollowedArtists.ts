import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { ArtistObject } from "../helpers/spotify.api";

type GetFollowedArtistsProps = { limit: number };

export async function getFollowedArtists({ limit }: GetFollowedArtistsProps) {
  const iterator = iterate();
  try {
    const artists: ArtistObject[] = [];
    for await (const items of iterator) {
      artists.push(...items);
      if (artists.length >= limit) {
        break;
      }
    }
    return { items: artists };
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getFollowedArtists.ts Error:", error);
    throw new Error(error);
  }
}

export async function* iterate() {
  const { spotifyClient } = getSpotifyClient();
  const batchSize = 50;
  let hasMore = true;
  let after: string | undefined = undefined;
  while (hasMore) {
    const response = await spotifyClient.getMeFollowing("artist", { limit: batchSize, after: after });
    const artists = response.artists.items || [];
    yield artists;
    after = artists[artists.length - 1]?.id || "";
    hasMore = artists.length > 0;
  }
}
