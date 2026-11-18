import { LaunchProps } from "@raycast/api";
import { control, parseAmount } from "./control";
import { runAndSettle } from "./spotifast";

export default function Command(props: LaunchProps<{ arguments: Arguments.SetVolume }>): Promise<void> {
  return control(async () => {
    const percent = Math.min(parseAmount(props.arguments.percent, 0), 100);
    const track = await runAndSettle(["volume", String(percent)], (_, after) => after?.volume === percent);
    return `🎚 ${track?.volume ?? percent}%`;
  });
}
