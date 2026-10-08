import { getMix, stop, stopAll } from "../player";

type Input = {
  /** Comma-separated sound ids to stop, e.g. "light-rain, campfire". Omit or pass an empty string to stop all sounds. */
  ids?: string;
};

export default async function tool(input: Input) {
  const ids = [...new Set((input.ids ?? "").split(",").map((id) => id.trim()))].filter(Boolean);
  if (ids.length === 0) return { stopped: stopAll() };
  const { sounds } = getMix();
  const hit = ids.filter((id) => sounds[id]);
  hit.forEach(stop);
  return { stopped: hit.length, notInMix: ids.filter((id) => !sounds[id]) };
}
