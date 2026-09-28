import { findSound, play, stopAll } from "../player";

type Input = {
  /** Sound ids to play, e.g. ["light-rain", "campfire"]. Use list-sounds to discover ids. */
  ids: string[];
  /** Volume from 0.05 to 1. Defaults to the sound's current mix volume, or the Default Volume preference. */
  volume?: number;
  /** Stop everything else first. Defaults to false. */
  replace?: boolean;
};

export default async function tool({ ids, volume, replace }: Input) {
  const unknown = ids.filter((id) => !findSound(id));
  if (unknown.length) throw new Error(`Unknown sound ids: ${unknown.join(", ")}. Call list-sounds for valid ids.`);
  if (replace) stopAll();
  for (const id of ids) await play(id, volume);
  return { playing: ids.map((id) => findSound(id)?.label ?? id) };
}
