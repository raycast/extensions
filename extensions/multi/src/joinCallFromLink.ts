import { LaunchProps } from "@raycast/api";
import runNoViewMultiCommand from "./lib/runNoViewMultiCommand";
import { joinCallFromLink } from "./lib/multi";

export default async (props: LaunchProps) => {
  await runNoViewMultiCommand(joinCallFromLink, props.arguments.url);
};
