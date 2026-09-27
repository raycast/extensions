import { LaunchProps } from "@raycast/api";
import { control, parseAmount } from "./control";
import { formatClock, runAndSettle, seekLanded } from "./spotifast";

export default function Command(props: LaunchProps<{ arguments: Arguments.SeekForward }>): Promise<void> {
  return control(async () => {
    const seconds = parseAmount(props.arguments.seconds, 15);
    const offsetMs = seconds * 1000;
    const track = await runAndSettle(["seek", "--", String(seconds)], seekLanded(offsetMs));
    return track ? `⏩ ${formatClock(track.positionMs)} / ${formatClock(track.durationMs)}` : "Nothing playing";
  });
}
