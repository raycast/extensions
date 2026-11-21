import { LaunchProps } from "@raycast/api";
import { quickSetLevel } from "./lib/quick-toggle";

export default async function Command(props: LaunchProps<{ arguments: Arguments.SetTrackpadSpeed }>) {
  await quickSetLevel("trackingSpeed", props.arguments.speed, "Trackpad Speed");
}
