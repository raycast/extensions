/**
 * Toggles the favorite status of the currently playing track in Apple Music.
 */
import { pipe } from "fp-ts/lib/function";
import * as music from "../util/scripts";
import { handleTaskEitherErrorWithoutHUD } from "../util/utils";

type Input = {
  /**
   * The name of the current track to favorite.
   */
  track: string;
  /**
   * Whether to favorite or unfavorite the track.
   */
  favorite?: boolean;
};

export default async function toggleFavorite(input: Input) {
  const { track, favorite = true } = input;
  if (favorite) {
    return await pipe(
      music.currentTrack.favorite,
      handleTaskEitherErrorWithoutHUD(`Failed to favorite the track ${track}`, `Favorited ${track}`),
    )();
  } else {
    return await pipe(
      music.currentTrack.unfavorite,
      handleTaskEitherErrorWithoutHUD(`Failed to unfavorite the track ${track}`, `Unfavorited ${track}`),
    )();
  }
}
