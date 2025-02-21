/**
 * Adds the currently playing track to a specified playlist.
 *
 * @param input - The input object containing the name of the target playlist.
 */
import { pipe } from "fp-ts/lib/function";
import * as music from "../util/scripts";
import { handleTaskEitherErrorWithoutHUD } from "../util/utils";

type Input = {
  /**
   * The name of the playlist to add the current track into.
   */
  playlist: string;
  /**
   * The name of the currenttrack to add to the playlist.
   */
  track: string;
};

export default async function addToPlaylist(input: Input) {
  const { playlist, track } = input;
  return await pipe(
    playlist,
    music.currentTrack.addToPlaylist,
    handleTaskEitherErrorWithoutHUD(
      `Could not add current track ${track} to playlist "${playlist}"`,
      `Track added to playlist "${playlist}"`,
    ),
  )();
}
