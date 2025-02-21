/**
 * Toggles shuffle mode in Apple Music
 */
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import * as music from "../util/scripts";

export default async function toggleShuffle(): Promise<string> {
  return await pipe(
    music.player.shuffle.toggle,
    TE.chain(() => music.player.shuffle.get),
    TE.match(
      (error) => {
        return `Could not toggle shuffle: ${error}`;
      },
      (status) => {
        return `Shuffle ${status ? "On" : "Off"}`;
      },
    ),
  )();
}
