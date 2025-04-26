/**
 * Sets the volume level of Apple Music.
 * @param input - The input object containing the volume level.
 */
import { player } from "../util/scripts";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

type Input = {
  /**
   * The volume level to set (0-100).
   */
  volume: number;
};

export default async function setVolume(input: Input) {
  const { volume } = input;
  if (volume < 0 || volume > 100) {
    throw new Error("Volume must be between 0 and 100.");
  }

  // Use the same FP‑TS pipeline as in set-volume.tsx,
  // calling player.volume.set directly since it already returns a TaskEither
  return await pipe(
    player.volume.set(volume),
    TE.map(() => ({ message: `Volume set to ${volume}` })),
    TE.mapLeft((error) => ({ message: `Could not set volume: ${error}` })),
  )();
}
