/**
 * Starts playback in Apple Music.
 */
import { pipe } from "fp-ts/lib/function";
import * as music from "../util/scripts";
import { handleTaskEitherErrorWithoutHUD } from "../util/utils";

type Input = {
  /**
   * The name of the track to play.
   */
  track: string;
};

export default async function play(input: Input) {
  return await pipe(
    music.player.play,
    handleTaskEitherErrorWithoutHUD(`Failed to start playback ${input.track}`, `Playback started ${input.track}`),
  )();
}
