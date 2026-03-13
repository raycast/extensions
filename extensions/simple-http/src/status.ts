import { LaunchProps, updateCommandMetadata } from "@raycast/api";
import { isRunning } from "./util";

export default function Command(props: LaunchProps) {
  const hasLaunchContext = props.launchContext?.running !== undefined;

  const running = hasLaunchContext ? props.launchContext?.running : isRunning();
  const subtitle = running ? "✔ Running" : "✖ Not Running";

  updateCommandMetadata({ subtitle });
}
