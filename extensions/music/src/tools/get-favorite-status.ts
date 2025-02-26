/**
 * Gets the favorite status of the currently playing track in Apple Music.
 */
import { pipe } from "fp-ts/lib/function";
import * as music from "../util/scripts";
import { handleTaskEitherErrorWithoutHUD } from "../util/utils";

type Input = {
  /**
   * The name of the current track to favorite.
   */
  track: string;
};

export default async function getFavoriteStatus(input: Input) {
  return await pipe(
    music.currentTrack.getFavorite,
    handleTaskEitherErrorWithoutHUD(
      `Could not get favorite status of ${input.track}`,
      `Favorite status of ${input.track} retrieved`,
    ),
  )();
}
