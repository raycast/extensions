import { LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { startTimer } from "./lib/actions";
import { formatRemaining, parseMinutes } from "./lib/timer";

export default async function Command(props: LaunchProps<{ arguments: { minutes: string } }>) {
  const parsed = parseMinutes(props.arguments.minutes);
  if ("error" in parsed) {
    await showToast({ style: Toast.Style.Failure, title: "Invalid duration", message: parsed.error });
    return;
  }
  const durationMs = parsed.minutes * 60_000;
  await showHUD(`Focus started · ${formatRemaining(durationMs)}`);
  await startTimer("focus", durationMs);
}
