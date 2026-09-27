import { control } from "./control";
import { formatTrack, runAndSettle } from "./spotifast";

export default function Command(): Promise<void> {
  return control(async () => {
    const track = await runAndSettle(["next"], (before, after) => before?.title !== after?.title);
    return track ? `⏭ ${formatTrack(track)}` : "Nothing playing";
  });
}
