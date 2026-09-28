import { getMix, stop, stopAll } from "../player";

type Input = {
  /** Sound ids to stop. Omit or pass an empty array to stop all sounds. */
  ids?: string[];
};

export default async function tool({ ids }: Input) {
  if (!ids?.length) return { stopped: stopAll() };
  const { sounds } = getMix();
  const hit = ids.filter((id) => sounds[id]);
  hit.forEach(stop);
  return { stopped: hit.length, notInMix: ids.filter((id) => !sounds[id]) };
}
