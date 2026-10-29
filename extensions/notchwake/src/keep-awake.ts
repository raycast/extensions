import { LaunchProps } from "@raycast/api";
import { invalid, minutes, run } from "./notchwake";

export default async function Command(props: LaunchProps<{ arguments: Arguments.KeepAwake }>) {
  const raw = props.arguments.minutes.trim().toLowerCase();
  if (raw === "off") return run("awake", { minutes: "off" }, "Mac can sleep again");
  const m = minutes(raw, 1440);
  if (m === undefined) return invalid("Use 1 to 1440 minutes, or off.");
  await run("awake", { minutes: String(m) }, `Awake for ${m} min`);
}
