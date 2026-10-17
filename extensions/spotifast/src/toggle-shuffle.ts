import { control } from "./control";
import { runAndSettle } from "./spotifast";

export default function Command(): Promise<void> {
  return control(async () => {
    const track = await runAndSettle(["shuffle"], (before, after) => before?.shuffle !== after?.shuffle);
    if (!track) return "🔀 Shuffle toggled";
    return track.shuffle ? "🔀 Shuffle On" : "➡️ Shuffle Off";
  });
}
