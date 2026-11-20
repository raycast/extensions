import type { LaunchProps } from "@raycast/api";
import { runCommand } from "./moment.ts";

export default async function Command(props: LaunchProps<{ arguments: Arguments.AddTime }>) {
  await runCommand("addTime", props.arguments.minutes);
}
