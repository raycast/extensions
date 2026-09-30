import { LaunchProps } from "@raycast/api";
import { control, parseAmount } from "./control";
import { runAndSettle } from "./spotifast";

export default function Command(props: LaunchProps<{ arguments: Arguments.VolumeUp }>): Promise<void> {
  return control(async () => {
    const percent = parseAmount(props.arguments.percent, 10);
    const track = await runAndSettle(
      ["volume-up", String(percent)],
      (before, after) => before?.volume !== after?.volume,
    );
    return track ? `🔊 ${track.volume}%` : "Nothing playing";
  });
}
