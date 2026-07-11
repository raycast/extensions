/**
 * Gets the dislike status of the currently playing track in Apple Music.
 */
import { pipe } from "fp-ts/lib/function";
import * as music from "../util/scripts";
import { handleTaskEitherErrorWithoutHUD } from "../util/utils";

type Input = {
  /**
   * The name of the current track to dislike.
   */
  track: string;
};

export default async function getDislikeStatus(input: Input) {
  return await pipe(
    music.currentTrack.getDislike,
    handleTaskEitherErrorWithoutHUD(
      `Could not get dislike status of ${input.track}`,
      `Dislike status of ${input.track} retrieved`,
    ),
  )();
}
