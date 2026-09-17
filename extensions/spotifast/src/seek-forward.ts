import { LaunchProps } from "@raycast/api";
import { control, parseAmount } from "./control";
import { runAndSettle } from "./spotifast";

export default function Command(props: LaunchProps<{ arguments: Arguments.SeekForward }>): Promise<void> {
  return control(async () => {
    const seconds = parseAmount(props.arguments.seconds, 15);
    const track = await runAndSettle(
      ["seek", "--", `${seconds}`],
      (before, after) => before?.positionMs !== after?.positionMs,
    );
    return track ? `⏩ ${clock(track.positionMs)} / ${clock(track.durationMs)}` : "Nothing playing";
  });
}

function clock(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
