import { findSound, play, stopAll } from "../player";

type Input = {
  /** Sound ids to play, e.g. ["light-rain", "campfire"]. Use list-sounds to discover ids. */
  ids: string[];
  /** Volume from 0.05 to 1. Defaults to 0.5. */
  volume?: number;
  /** Stop everything else first. Defaults to false. */
  replace?: boolean;
};

export default async function tool({ ids, volume, replace }: Input) {
  const unknown = ids.filter((id) => !findSound(id));
  if (unknown.length) throw new Error(`Unknown sound ids: ${unknown.join(", ")}. Call list-sounds for valid ids.`);
  if (replace) stopAll();
  const vol = volume === undefined ? undefined : Math.min(1, Math.max(0.05, volume));
  for (const id of ids) await play(id, vol);
  return { playing: ids.map((id) => findSound(id)!.label) };
}
