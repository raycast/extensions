/**
 * Adds the currently playing track to the user's library.
 */
import { pipe } from "fp-ts/lib/function";
import * as music from "../util/scripts";
import { handleTaskEitherErrorWithoutHUD } from "../util/utils";

type Input = {
  /**
   * The name of the current track to add to the library.
   */
  track: string;
};

export default async function addToLibrary(input: Input) {
  return await pipe(
    music.currentTrack.addToLibrary,
    handleTaskEitherErrorWithoutHUD(`Failed to Add to Library ${input.track}`, `Added to library ${input.track}`),
  )();
}
