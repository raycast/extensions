import { LaunchProps } from "@raycast/api";
import { invalid, minutes, run } from "./notchwake";

export default async function Command(props: LaunchProps<{ arguments: Arguments.StartTimer }>) {
  const m = minutes(props.arguments.minutes, 600);
  if (m === undefined) return invalid("Use 1 to 600 minutes.");
  await run("timer/start", { minutes: String(m) }, `Timer: ${m} min`);
}
