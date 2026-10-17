import { control } from "./control";
import { formatTrack, runAndSettle } from "./spotifast";

export default function Command(): Promise<void> {
  return control(async () => {
    const track = await runAndSettle(["like"], (before, after) => before?.saved !== after?.saved);
    if (!track) return "Nothing playing";
    if (track.saved === undefined) return `❤️ ${formatTrack(track)}`;
    return track.saved ? `❤️ Liked ${formatTrack(track)}` : `🤍 Removed ${formatTrack(track)} from Liked Songs`;
  });
}
