import { getMix } from "../player";
import { categories } from "../sounds";

/** Lists every available sound with its id, category, and whether it is playing or paused in the mix. */
export default async function tool() {
  const { sounds } = getMix();
  return categories.map((c) => ({
    category: c.title,
    sounds: c.sounds.map((s) => ({
      id: s.id,
      label: s.label,
      inMix: !!sounds[s.id],
      playing: !!sounds[s.id]?.pid,
      volume: sounds[s.id]?.volume,
    })),
  }));
}
