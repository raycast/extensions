import { getPlaying, stop, stopAll } from "../player";

type Input = {
  /** Sound ids to stop. Omit or pass an empty array to stop all sounds. */
  ids?: string[];
};

export default async function tool({ ids }: Input) {
  if (!ids?.length) return { stopped: stopAll() };
  const playing = getPlaying();
  const hit = ids.filter((id) => playing[id]);
  hit.forEach(stop);
  return { stopped: hit.length, notPlaying: ids.filter((id) => !playing[id]) };
}
