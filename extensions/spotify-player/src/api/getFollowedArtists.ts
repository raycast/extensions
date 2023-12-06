import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { ArtistObject } from "../helpers/spotify.api";
import { iterateWithAfter } from "../helpers/spotifyIterator";

type GetFollowedArtistsProps = { limit: number };

export async function* getFollowedArtists({
  limit,
}: GetFollowedArtistsProps): AsyncGenerator<{ artists: ArtistObject[]; offset: number }, void, unknown> {
  const { spotifyClient } = getSpotifyClient();
  const iterator = iterateWithAfter<ArtistObject>(limit, (input) =>
    spotifyClient.getMeFollowing("artist", input).then((response) => ({ items: response.artists.items })),
  );
  try {
    for await (const { items, offset } of iterator) {
      yield { artists: items, offset };
    }
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getFollowedArtists.ts Error:", error);
    throw new Error(error);
  }
}
