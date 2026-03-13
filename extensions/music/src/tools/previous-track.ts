/**
 * Rewinds to the previous track in Apple Music.
 */
import { pipe } from "fp-ts/lib/function";
import * as music from "../util/scripts";
import { handleTaskEitherErrorWithoutHUD } from "../util/utils";

type Input = {
  /**
   * The name of the current track to rewind.
   */
  track: string;
};

export default async function previousTrack(input: Input) {
  return await pipe(
    music.player.previous,
    handleTaskEitherErrorWithoutHUD(`Failed to rewind track ${input.track}`, `Track rewinded ${input.track}`),
  )();
}
