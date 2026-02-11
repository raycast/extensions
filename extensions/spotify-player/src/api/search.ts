import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type SearchProps = {
  query: string;
  limit?: number;
  types?: ("album" | "artist" | "playlist" | "track" | "show" | "episode" | "audiobook")[];
};

function filterNullItems<T>(category: { items?: (T | null)[] } | undefined) {
  if (!category?.items) return undefined;
  return {
    ...category,
    items: category.items.filter((item) => item !== null),
  };
}

export async function search({
  query,
  limit = 50,
  types = ["track", "artist", "album", "playlist", "show", "episode"],
}: SearchProps) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.search(query, types, {
      limit,
    });
    return {
      audiobooks: filterNullItems(response.audiobooks),
      tracks: filterNullItems(response.tracks),
      artists: filterNullItems(response.artists),
      albums: filterNullItems(response.albums),
      playlists: filterNullItems(response.playlists),
      shows: filterNullItems(response.shows),
      episodes: filterNullItems(response.episodes),
    };
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("search.ts Error:", error);
    throw new Error(error);
  }
}
