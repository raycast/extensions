import useGemini from "./api/gemini";
import { getPreferenceValues } from "@raycast/api";

export default function AskAI(props) {
  const { prompt } = getPreferenceValues();
  if (props?.launchContext?.buffer) {
    return useGemini(
      { ...props, arguments: props?.launchContext?.args },
      {
        buffer: props?.launchContext?.buffer,
        context: props?.launchContext?.context,
        useSelected: props?.launchContext?.useSelected,
      }
    );
  } else {
    return useGemini(props, { context: prompt });
  }
}
