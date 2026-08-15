import useFuelIX from "./api/useFuelIX";
import { getPreferenceValues, LaunchProps } from "@raycast/api";

interface AskAIProps extends LaunchProps<{ arguments: Arguments.AskAI }> {
  launchContext?: {
    buffer?: Buffer[];
    args?: Arguments.AskAI;
    context?: string;
    useSelected?: boolean;
  };
}

export default function AskAI(props: AskAIProps) {
  const { prompt } = getPreferenceValues();
  if (props?.launchContext?.buffer) {
    return useFuelIX({
      buffer: props?.launchContext?.buffer,
      context: props?.launchContext?.context,
      useSelected: props?.launchContext?.useSelected,
    });
  } else {
    return useFuelIX({ context: prompt });
  }
}
