/**
 * Retrieves albums from your music library, with optional search functionality.
 *
 * @param input - An optional input object containing the search term.
 */
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import * as O from "fp-ts/Option";
import { parseResult } from "../util/parser";
import { fromEmptyOrNullable } from "../util/option";
import * as music from "../util/scripts";
import { Album } from "../util/models";

type Input = {
  /**
   * Optional search term to filter albums by name or artist.
   */
  search?: string;
};

export default async function getLibraryAlbums(input?: Input) {
  const searchTerm = input?.search?.trim();

  const albumsTE = searchTerm
    ? pipe(
        searchTerm,
        music.albums.search,
        TE.map((albumsString) =>
          pipe(
            albumsString,
            fromEmptyOrNullable,
            O.getOrElse(() => ""),
          ),
        ),
      )
    : music.albums.getAll;

  return await pipe(
    albumsTE,
    TE.map(parseResult<Album>()),
    TE.map((albums) =>
      pipe(
        albums,
        fromEmptyOrNullable,
        O.getOrElse(() => [] as readonly Album[]),
      ),
    ),
    TE.mapLeft((error) => {
      throw new Error(`Could not retrieve albums: ${error}`);
    }),
  )();
}
