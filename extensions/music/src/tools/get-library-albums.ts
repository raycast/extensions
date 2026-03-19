/**
 * Retrieves albums from your music library, with optional search functionality.
 *
 * @param input - An optional input object containing the search term.
 */
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import { Album } from "../util/models";
import * as music from "../util/scripts";

type Input = {
  /**
   * Optional search term to filter albums by name or artist.
   */
  search?: string;
};

export default async function getLibraryAlbums(input?: Input) {
  const searchTerm = input?.search?.trim();

  const albumsTE = searchTerm ? music.albums.search(searchTerm) : music.albums.getAll;

  return await pipe(
    albumsTE,
    TE.getOrElse(() => async () => [] as readonly Album[]),
  )();
}
