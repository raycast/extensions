import type { LaunchProps } from "@raycast/api";
import { runCommand } from "./moment.ts";

export default async function Command(props: LaunchProps<{ arguments: Arguments.StartFocus }>) {
  await runCommand("startFocus", props.arguments.minutes);
}
