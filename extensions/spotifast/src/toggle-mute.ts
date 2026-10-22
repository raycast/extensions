import { control } from "./control";
import { runAndSettle } from "./spotifast";

export default function Command(): Promise<void> {
  return control(async () => {
    const track = await runAndSettle(["mute"], (before, after) => before?.volume !== after?.volume);
    if (!track) return "🔇 Mute toggled";
    return track.volume === 0 ? "🔇 Muted" : `🔊 ${track.volume}%`;
  });
}
