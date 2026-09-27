import { getPlaying } from "../player";
import { categories } from "../sounds";

/** Lists every available sound with its id, category, and playback state. */
export default async function tool() {
  const playing = getPlaying();
  return categories.map((c) => ({
    category: c.title,
    sounds: c.sounds.map((s) => ({
      id: s.id,
      label: s.label,
      playing: !!playing[s.id],
      volume: playing[s.id]?.volume,
    })),
  }));
}
