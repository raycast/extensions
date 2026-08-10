import { search } from "../api/search";
import { withSpotifyClient } from "../helpers/withSpotifyClient";
import { ItemType } from "./types";

type Input = {
  /**
   * The search query.
   *
   * You can narrow down your search using field filters. The available filters are album, artist, track, year, upc, tag:hipster, tag:new, isrc, and genre. Each field filter only applies to certain result types.
   * The artist and year filters can be used while searching albums, artists and tracks. You can filter on a single year or a range (e.g. 1955-1960).
   * The album filter can be used while searching albums and tracks.
   * The genre filter can be used while searching artists and tracks. genre:metal, genre:rock, genre:pop, genre:classical, etc
   * The isrc and track filters can be used while searching tracks.
   * The upc, tag:new and tag:hipster filters can only be used while searching albums. The tag:new filter will return albums released in the past two weeks and tag:hipster can be used to return only albums with the lowest 10% popularity.
   */
  query: string;
  /**
   * List of item types to search across. If unsure, fallback to 'track, album, artist, playlist'.
   */
  types: ItemType[];
  /**
   * The maximum number of items to return. Keep as small as possible to reduce latency. If unsure fallback to default limit of 20.
   */
  limit?: number;
};

/**
 * Search for an item.
 *
 * Some examples:
 * - play latest all in episode -> { query: "all-in podcast", types: ["episode"] })
 * - play fred again -> { query: "fred again", types: ["track", "album", "artist", "playlist"] })
 * - find 80s metal tracks -> { query: "year:1980-1989 genre:metal", types: ["track"] })
 * - show new indie albums -> { query: "tag:new genre:indie", types: ["album"] })
 * - play huberman sleep episode -> { query: "huberman sleep", types: ["episode"] })
 * - find underground electronic artists -> { query: "genre:electronic tag:hipster", types: ["artist"] })
 */
const tool = async ({ query, types, limit = 20 }: Input) => {
  const response = await search({ query, types, limit });

  const result = {
    tracks: response.tracks?.items?.filter(Boolean).map((item) => ({
      id: item.id,
      name: item.name,
      artists: item.artists?.map((artist) => artist.name),
      album: item.album?.name,
      type: item.type,
      popularity: item.popularity,
      releaseDate: item.album?.release_date,
    })),
    albums: response.albums?.items?.filter(Boolean).map((item) => ({
      id: item.id,
      name: item.name,
      artists: item.artists?.map((artist) => artist.name),
      type: item.type,
      releaseDate: item.release_date,
    })),
    artists: response.artists?.items?.filter(Boolean).map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      popularity: item.popularity,
    })),
    playlists: response.playlists?.items?.filter(Boolean).map((item) => ({
      id: item.id,
      name: item.name,
      owner: item.owner ? { name: item.owner.display_name, id: item.owner.id } : undefined,
      type: item.type,
      description: item.description,
    })),
    shows: response.shows?.items?.filter(Boolean).map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      description: item.description,
    })),
    episodes: response.episodes?.items?.filter(Boolean).map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      description: item.description,
      releaseDate: item.release_date,
    })),
    audiobooks: response.audiobooks?.items?.filter(Boolean).map((item) => ({
      id: item.id,
      name: item.name,
      authors: item.authors.map((author) => author.name),
      type: item.type,
      description: item.description,
    })),
  };

  return result;
};

export default withSpotifyClient(tool);
