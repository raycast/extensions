import { LaunchProps } from "@raycast/api";
import { CaptureContext, capture } from "./lib/capture";

export default function QuickCapture(
  props: LaunchProps<{
    arguments: { text: string };
    launchContext?: CaptureContext;
  }>,
) {
  return capture(props.arguments.text, props.launchContext?.vaultPath);
}
