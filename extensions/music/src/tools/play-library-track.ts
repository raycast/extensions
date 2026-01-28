/**
 * Plays a specific track from the library in Apple Music.
 *
 * @param input - The input object containing the track ID and track name.
 */
import { pipe } from "fp-ts/lib/function";
import * as music from "../util/scripts";
import { handleTaskEitherErrorWithoutHUD } from "../util/utils";

type Input = {
  /**
   * The unique identifier of the track to play.
   */
  trackId: string;
  /**
   * The name of the track to play.
   */
  trackName: string;
};

export default async function playLibraryTrack(input: Input) {
  const { trackId, trackName } = input;
  return await pipe(
    trackId,
    music.track.playById,
    handleTaskEitherErrorWithoutHUD(`Could not play this track ${trackName}`, `Now playing track "${trackName}"`),
  )();
}
