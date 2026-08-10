/**
 * Returns the current volume level of Apple Music.
 */
import { player } from "../util/scripts";

export default async function getVolume() {
  const volume = await player.volume.get();
  return { volume };
}
