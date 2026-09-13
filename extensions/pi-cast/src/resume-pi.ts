import type { LaunchProps } from "@raycast/api";
import { launchPi } from "./lib/launch-pi";

export default async function Command(props: LaunchProps<{ arguments: Arguments.ResumePi }>) {
  await launchPi({
    directory: props.arguments.directory,
    prompt: props.arguments.prompt,
    sessionMode: "resume",
  });
}
