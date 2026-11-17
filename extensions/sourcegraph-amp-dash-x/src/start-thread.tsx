import { LaunchProps } from "@raycast/api";
import { startThreadAndOpen } from "./lib/ui";

export default async function StartThread(props: LaunchProps<{ arguments: Arguments.StartThread }>) {
  await startThreadAndOpen(props.arguments.prompt, props.arguments.project);
}
