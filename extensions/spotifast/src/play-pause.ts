import { control } from "./control";
import { formatTrack, runAndSettle } from "./spotifast";

export default function Command(): Promise<void> {
  return control(async () => {
    const track = await runAndSettle(["play-pause"], (before, after) => before?.state !== after?.state);
    if (!track) return "Nothing playing";
    return `${track.state === "playing" ? "▶" : "⏸"} ${formatTrack(track)}`;
  });
}
