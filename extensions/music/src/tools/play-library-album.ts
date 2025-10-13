/**
 * Plays an album from the library in Apple Music.
 *
 * @param input - The input object containing the album name and an optional shuffle flag.
 */
import { pipe } from "fp-ts/lib/function";
import * as music from "../util/scripts";
import { handleTaskEitherErrorWithoutHUD } from "../util/utils";

type Input = {
  /**
   * The name of the album to play.
   */
  album: string;
  /**
   * Optional flag to indicate whether the album should be played in shuffle mode.
   * Defaults to false if not provided.
   */
  shuffle?: boolean;
};

export default async function playLibraryAlbum(input: Input) {
  const { album, shuffle = false } = input;
  return await pipe(
    album,
    music.albums.play(shuffle),
    handleTaskEitherErrorWithoutHUD(
      "Operation failed",
      `Now playing album "${album}"${shuffle ? " in shuffle mode" : ""}`,
    ),
  )();
}
