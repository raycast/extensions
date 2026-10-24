import { LaunchProps } from "@raycast/api";
import { quickSetLevel } from "./lib/quick-toggle";

export default async function Command(props: LaunchProps<{ arguments: Arguments.SetMouseSpeed }>) {
  await quickSetLevel("mouseSpeed", props.arguments.speed, "Mouse Speed");
}
