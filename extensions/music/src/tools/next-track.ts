/**
 * Skips to the next track in Apple Music.
 */
import { pipe } from "fp-ts/lib/function";
import * as music from "../util/scripts";
import { handleTaskEitherErrorWithoutHUD } from "../util/utils";

type Input = {
  /**
   * The name of the current track to skip.
   */
  track: string;
};

export default async function nextTrack(input: Input) {
  return await pipe(
    music.player.next,
    handleTaskEitherErrorWithoutHUD(`Failed to skip track ${input.track}`, `Track skipped ${input.track}`),
  )();
}
