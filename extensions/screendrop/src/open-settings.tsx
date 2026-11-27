import { LaunchProps } from "@raycast/api";
import { run } from "./run";

export default async function Command(props: LaunchProps<{ arguments: Arguments.OpenSettings }>) {
  const tab = props.arguments.tab;
  await run(tab ? `screendrop://open-settings?tab=${encodeURIComponent(tab)}` : "screendrop://open-settings");
}
