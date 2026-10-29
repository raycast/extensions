import { getMix } from "../player";
import { categories } from "../sounds";
export default async function tool() {
  const { sounds } = await getMix();
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
