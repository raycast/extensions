import { control } from "./control";
import { formatRepeat, runAndSettle } from "./spotifast";

export default function Command(): Promise<void> {
  return control(async () => {
    const track = await runAndSettle(["repeat"], (before, after) => before?.repeat !== after?.repeat);
    if (!track) return "🔁 Repeat cycled";
    return `${track.repeat === "track" ? "🔂" : track.repeat === "context" ? "🔁" : "➡️"} ${formatRepeat(track.repeat)}`;
  });
}
