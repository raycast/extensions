/**
 * Starts a playlist from your Apple Music library.
 *
 * This tool accepts an input containing the playlist id (which should be obtained from the "get-playlists" tool)
 * and an optional "shuffle" flag. If the shuffle flag is true, the playlist will be played in shuffle mode.
 *
 * Example input:
 * {
 *   "playlistId": "abcdefg12345",
 *   "shuffle": true
 * }
 */
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import * as music from "../util/scripts";

type Input = {
  /**
   * The unique identifier of the playlist to start.
   * This id should be obtained from the output of the "get-playlists" tool.
   */
  playlistId: string;

  /**
   * Optional flag to indicate whether the playlist should be played in shuffle mode.
   * Defaults to false if not provided.
   */
  shuffle?: boolean;
};

export default async function startPlaylist(input: Input): Promise<string> {
  return await pipe(
    // First apply the shuffle parameter to get a function that expects the ID
    music.playlists.playById(input.shuffle ?? false)(input.playlistId),
    TE.match(
      (error) => {
        return `Could not play the playlist: ${error}`;
      },
      () => {
        return "Playlist started successfully";
      },
    ),
  )();
}
