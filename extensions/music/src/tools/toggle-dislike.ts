/**
 * Toggles the dislike status of the currently playing track in Apple Music.
 */
import { pipe } from "fp-ts/lib/function";
import * as music from "../util/scripts";
import { handleTaskEitherErrorWithoutHUD } from "../util/utils";

type Input = {
  /**
   * The name of the current track to dislike.
   */
  track: string;

  /**
   * Optional flag to indicate whether the track is disliked.
   * Default is true if not provided.
   */
  dislike?: boolean;
};

export default async function toggleDislike(input: Input) {
  const { track, dislike = true } = input;
  if (dislike) {
    return await pipe(
      music.currentTrack.dislike,
      handleTaskEitherErrorWithoutHUD(`Could not dislike the track ${track}`, `Disliked ${track}`),
    )();
  } else {
    return await pipe(
      music.currentTrack.undislike,
      handleTaskEitherErrorWithoutHUD(`Could not undislike the track ${track}`, `Undisliked ${track}`),
    )();
  }
}
