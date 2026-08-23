import type { LaunchProps } from "@raycast/api";
import { StartAgentForm } from "./components/start-agent-form";
import { mergeStartAgentPresets, type StartAgentPreset } from "./lib/start-agent-preset";

type Props = LaunchProps<{
  arguments: Arguments.StartAgent;
  launchContext: StartAgentPreset;
}>;

export default function Command(props: Props) {
  return <StartAgentForm initialValues={mergeStartAgentPresets(props.launchContext, props.arguments)} />;
}
