import { LaunchProps } from "@raycast/api";
import { openOpenCode } from "./lib/terminal";

export default async function NewSession(props: LaunchProps<{ arguments: Arguments.NewSession }>) {
  const directory = props.arguments.directory || process.env.HOME || "/";
  await openOpenCode(directory, props.arguments.prompt);
}
