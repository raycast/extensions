import { LaunchProps } from "@raycast/api";
import { runTrellisCommand } from "./lib/trellis";

export default async function Command(props: LaunchProps<{ arguments: Arguments.OpenSettings }>) {
  const pane = props.arguments.pane || "general";
  await runTrellisCommand(`settings?pane=${encodeURIComponent(pane)}`);
}
