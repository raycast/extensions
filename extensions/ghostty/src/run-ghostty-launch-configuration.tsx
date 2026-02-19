import { LaunchProps } from "@raycast/api";
import { RunLaunchConfiguration } from "./open-ghostty-launch-configuration";

export default async function Command(props: LaunchProps<{ arguments: Arguments.RunGhosttyLaunchConfiguration }>) {
  let { config } = props.arguments;
  config = config.toLowerCase().replace(/\s+/g, "-");
  await RunLaunchConfiguration({ name: config });
}
// Doesn't work consistently
