import type { LaunchProps } from "@raycast/api";
import { runCommand, send } from "./salamander";

export default async function Command(props: LaunchProps<{ arguments: Arguments.OpenWorkspace }>) {
  await runCommand(() => send("workspace", [["name", props.arguments.name.trim()]]));
}
