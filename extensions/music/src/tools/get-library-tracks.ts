/**
 * Retrieves tracks from your music library, with optional search functionality.
 *
 * @param input - An optional input object containing the search term.
 */
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import * as O from "fp-ts/Option";
import { parseResult } from "../util/parser";
import { fromEmptyOrNullable } from "../util/option";
import * as music from "../util/scripts";
import { Track } from "../util/models";

type Input = {
  /**
   * Optional search term to filter tracks by name or artist.
   */
  search?: string;
};

export default async function getLibraryTracks(input?: Input) {
  const searchTerm = input?.search?.trim();

  // Use the search function when searchTerm is provided; otherwise, fallback to getAll().
  const tracksTE =
    searchTerm && searchTerm.length > 0
      ? pipe(
          searchTerm,
          music.track.search,
          TE.map((tracksString: string) =>
            pipe(
              tracksString,
              fromEmptyOrNullable,
              O.getOrElse(() => ""),
            ),
          ),
        )
      : music.track.getAll();

  return await pipe(
    tracksTE,
    TE.map(parseResult<Track>()),
    TE.map((tracksOption) =>
      pipe(
        tracksOption,
        fromEmptyOrNullable,
        O.getOrElse(() => [] as readonly Track[]),
      ),
    ),
    TE.mapLeft((error) => {
      throw new Error(`Could not retrieve tracks: ${error}`);
    }),
  )();
}
