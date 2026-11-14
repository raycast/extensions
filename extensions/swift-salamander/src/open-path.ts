import type { LaunchProps } from "@raycast/api";
import { openFields, runCommand, send } from "./salamander";

export default async function Command(props: LaunchProps<{ arguments: Arguments.OpenPath }>) {
  await runCommand(() => send("open", openFields([props.arguments.path])));
}
