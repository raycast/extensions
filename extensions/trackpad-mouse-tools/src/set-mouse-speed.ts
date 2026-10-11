import { LaunchProps } from "@raycast/api";
import { quickSetLevel } from "./lib/quick-toggle";

export default async function Command(props: LaunchProps<{ arguments: { speed: string } }>) {
  await quickSetLevel("mouseSpeed", props.arguments.speed, "Mouse Speed");
}
