/**
 * Pauses playback in Apple Music.
 */
import { pipe } from "fp-ts/lib/function";
import * as music from "../util/scripts";
import { handleTaskEitherErrorWithoutHUD } from "../util/utils";

type Input = {
  /**
   * The name of the current track to pause.
   */
  track: string;
};

export default async function pause(input: Input) {
  return await pipe(
    music.player.pause,
    handleTaskEitherErrorWithoutHUD(`Failed to pause playback ${input.track}`, `Playback paused ${input.track}`),
  )();
}
