/**
 * Retrieves info about the currently playing track in Apple Music.
 */
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import * as music from "../util/scripts";

export default async function getCurrentlyPlaying() {
  return await pipe(
    music.currentTrack.getCurrentTrack(),
    TE.map((track) => ({
      name: track.name,
      artist: track.artist,
    })),
    TE.mapLeft((error) => ({
      error: `Could not get currently playing track: ${error}`,
    })),
  )();
}
