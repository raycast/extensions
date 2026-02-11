/**
 * Gets the current shuffle mode in Apple Music
 */
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import * as music from "../util/scripts";

export default async function getCurrentShuffle(): Promise<string> {
  return await pipe(
    music.player.shuffle.get,
    TE.match(
      (error) => {
        return `Could not get current shuffle: ${error}`;
      },
      (status) => {
        return `Current shuffle is ${status ? "On" : "Off"}`;
      },
    ),
  )();
}
