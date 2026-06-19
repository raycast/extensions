import useGemini from "./api/gemini";
import { getPreferenceValues, LaunchProps } from "@raycast/api";

interface AskAILaunchContext {
  buffer?: Buffer[];
  args?: Record<string, string | undefined>;
  context?: string;
  useSelected?: boolean;
}

export default function AskAI(props: LaunchProps<{ arguments: { query: string }; launchContext: AskAILaunchContext }>) {
  const { prompt } = getPreferenceValues<Preferences.AskAI>();
  if (props?.launchContext?.buffer) {
    return useGemini(
      { ...props, arguments: props?.launchContext?.args ?? props.arguments },
      {
        buffer: props?.launchContext?.buffer,
        context: props?.launchContext?.context,
        useSelected: props?.launchContext?.useSelected,
      },
    );
  } else {
    return useGemini(props, { context: prompt });
  }
}
