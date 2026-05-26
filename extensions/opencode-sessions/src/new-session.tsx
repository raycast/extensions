import { LaunchProps } from "@raycast/api";
import { openOpenCode } from "./lib/terminal";

export default async function NewSession(props: LaunchProps<{ arguments: { directory?: string; prompt?: string } }>) {
  const directory = props.arguments.directory || process.env.HOME || "/";
  await openOpenCode(directory, props.arguments.prompt);
}
